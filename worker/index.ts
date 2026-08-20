/**
 * Harvest Valley API — Cloudflare Worker
 * Uses D1 for database, KV for config.
 * Admin endpoints protected by HMAC token with expiration.
 */

export interface Env {
  DB: D1Database;
  R2?: R2Bucket;
  KV: KVNamespace;
  WALLET_ADDRESS: string;
  WALLET_NETWORK: string;
  TELEGRAM: string;
  ADMIN_SECRET: string;
}

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
};

const SESSION_TTL_MS = 8 * 60 * 60 * 1000;
const MAX_DEPOSIT_AMOUNT = 1_000_000;
const RATE_LIMIT_WINDOW_MS = 60_000;
const RATE_LIMIT_MAX = 10;

const loginAttempts = new Map<string, { count: number; windowStart: number }>();

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json", ...CORS_HEADERS },
  });
}

function error(msg: string, status = 400) {
  return json({ error: msg }, status);
}

async function hmacSign(secret: string, message: string): Promise<string> {
  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey(
    "raw", encoder.encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]
  );
  const sig = await crypto.subtle.sign("HMAC", key, encoder.encode(message));
  return Array.from(new Uint8Array(sig)).map(b => b.toString(16).padStart(2, "0")).join("");
}

function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let result = 0;
  for (let i = 0; i < a.length; i++) {
    result |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return result === 0;
}

function isRateLimited(ip: string): boolean {
  const now = Date.now();
  const entry = loginAttempts.get(ip);
  if (!entry || now - entry.windowStart > RATE_LIMIT_WINDOW_MS) {
    loginAttempts.set(ip, { count: 1, windowStart: now });
    return false;
  }
  entry.count++;
  return entry.count > RATE_LIMIT_MAX;
}

async function verifyAdmin(request: Request, env: Env): Promise<boolean> {
  const auth = request.headers.get("Authorization");
  if (!auth?.startsWith("Bearer ")) return false;
  const token = auth.slice(7);

  const now = Date.now();
  const tsStr = token.slice(0, 13);
  const receivedSig = token.slice(13);
  const ts = parseInt(tsStr, 10);

  if (isNaN(ts) || now - ts > SESSION_TTL_MS || ts > now) {
    return false;
  }

  const expectedSig = await hmacSign(env.ADMIN_SECRET, tsStr);
  return timingSafeEqual(receivedSig, expectedSig);
}

async function initDb(db: D1Database) {
  await db.exec(`CREATE TABLE IF NOT EXISTS deposits (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    player_name TEXT NOT NULL,
    amount REAL NOT NULL,
    currency TEXT DEFAULT 'USDT',
    network TEXT DEFAULT 'TRC20',
    tx_hash TEXT NOT NULL UNIQUE,
    status TEXT DEFAULT 'completed',
    confirmed_by TEXT NOT NULL,
    confirmed_at TEXT DEFAULT (datetime('now')),
    created_at TEXT DEFAULT (datetime('now'))
  )`);
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);
    const path = url.pathname;
    const method = request.method;

    if (method === "OPTIONS") {
      return new Response(null, { status: 204, headers: CORS_HEADERS });
    }

    try { await initDb(env.DB); } catch {}

    // ─── Health ───
    if (path === "/api/health" && method === "GET") {
      return json({ ok: true, timestamp: new Date().toISOString() });
    }

    // ─── Admin: login ───
    if (path === "/api/admin/login" && method === "POST") {
      const clientIP = request.headers.get("CF-Connecting-IP") || "unknown";
      if (isRateLimited(clientIP)) {
        return error("Demasiados intentos. Espera 1 minuto.", 429);
      }

      const body = await request.json() as any;
      const { password } = body || {};
      if (!password) return error("Password required");

      const inputHash = await hmacSign(env.ADMIN_SECRET, password);
      const expectedHash = await hmacSign(env.ADMIN_SECRET, env.ADMIN_SECRET);

      if (!timingSafeEqual(inputHash, expectedHash)) {
        return error("Invalid password", 401);
      }

      const ts = Date.now().toString();
      const sig = await hmacSign(env.ADMIN_SECRET, ts);
      return json({ ok: true, token: ts + sig });
    }

    // ─── Deposit config (public) ───
    if (path === "/api/deposit/config" && method === "GET") {
      const wallet = (await env.KV.get("config:wallet_address")) || env.WALLET_ADDRESS;
      const network = (await env.KV.get("config:network")) || env.WALLET_NETWORK;
      const telegram = (await env.KV.get("config:telegram")) || env.TELEGRAM;
      return json({ walletAddress: wallet, network, telegram });
    }

    // ─── Player deposits (public) ───
    const playerMatch = path.match(/^\/api\/deposits\/player\/(.+)$/);
    if (playerMatch && method === "GET") {
      const name = decodeURIComponent(playerMatch[1]);
      if (!name) return error("Player name required");

      const { results } = await env.DB.prepare(
        "SELECT id, amount, currency, network, tx_hash, confirmed_at FROM deposits WHERE player_name = ?1 AND status = 'completed' ORDER BY confirmed_at DESC"
      ).bind(name).all();

      return json({
        deposits: results.map((r: any) => ({
          id: r.id,
          amount: r.amount,
          currency: r.currency,
          network: r.network,
          txHash: r.tx_hash,
          confirmedAt: r.confirmed_at,
        })),
      });
    }

    // ─── All admin routes require auth below ───
    if (path.startsWith("/api/admin/")) {
      if (!(await verifyAdmin(request, env))) {
        return error("Unauthorized", 401);
      }
    }

    // ─── Admin: confirm deposit ───
    if (path === "/api/admin/deposits" && method === "POST") {
      const body = await request.json() as any;
      const { playerName, amount, currency, network, txHash, adminName } = body || {};

      if (!playerName || !amount) {
        return error("Jugador y cantidad son requeridos");
      }

      const numAmount = parseFloat(amount);
      if (isNaN(numAmount) || numAmount <= 0) {
        return error("Cantidad inválida");
      }
      if (numAmount > MAX_DEPOSIT_AMOUNT) {
        return error(`Cantidad máxima: $${MAX_DEPOSIT_AMOUNT.toLocaleString()}`);
      }

      const cleanName = playerName.trim().slice(0, 100);
      const finalCurrency = (currency || "USDT").slice(0, 10);
      const finalNetwork = (network || "BEP20").slice(0, 20);
      const finalAdmin = (adminName || "admin").trim().slice(0, 100);
      const txHashClean = txHash?.trim().slice(0, 200) || `ADMIN-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

      const existing = await env.DB.prepare("SELECT id FROM deposits WHERE tx_hash = ?1")
        .bind(txHashClean).first();
      if (existing) {
        return error("Esta transaccion ya fue registrada.", 409);
      }

      await env.DB.prepare(
        `INSERT INTO deposits (player_name, amount, currency, network, tx_hash, status, confirmed_by, confirmed_at)
         VALUES (?1, ?2, ?3, ?4, ?5, 'completed', ?6, datetime('now'))`
      ).bind(cleanName, numAmount, finalCurrency, finalNetwork, txHashClean, finalAdmin).run();

      const deposit = await env.DB.prepare("SELECT * FROM deposits WHERE tx_hash = ?1")
        .bind(txHashClean).first();

      return json({
        ok: true,
        deposit: {
          id: deposit?.id,
          playerName: deposit?.player_name,
          amount: deposit?.amount,
          currency: deposit?.currency,
          network: deposit?.network,
          txHash: deposit?.tx_hash,
          confirmedBy: deposit?.confirmed_by,
          confirmedAt: deposit?.confirmed_at,
        },
      });
    }

    // ─── Admin: list recent deposits ───
    if (path === "/api/admin/deposits" && method === "GET") {
      const limit = Math.min(parseInt(url.searchParams.get("limit") || "50"), 200);
      const { results } = await env.DB.prepare(
        "SELECT id, player_name, amount, currency, network, tx_hash, confirmed_by, confirmed_at FROM deposits ORDER BY confirmed_at DESC LIMIT ?1"
      ).bind(limit).all();

      return json({
        deposits: results.map((r: any) => ({
          id: r.id,
          playerName: r.player_name,
          amount: r.amount,
          currency: r.currency,
          network: r.network,
          txHash: r.tx_hash,
          confirmedBy: r.confirmed_by,
          confirmedAt: r.confirmed_at,
        })),
      });
    }

    // ─── Admin: player summary ───
    const adminPlayerMatch = path.match(/^\/api\/admin\/player\/(.+)$/);
    if (adminPlayerMatch && method === "GET") {
      const name = decodeURIComponent(adminPlayerMatch[1]);
      if (!name) return error("Player name required");

      const result = await env.DB.prepare(
        "SELECT SUM(amount) as total_deposited, COUNT(*) as deposit_count FROM deposits WHERE player_name = ?1 AND status = 'completed'"
      ).bind(name).first();

      return json({
        totalDeposited: (result?.total_deposited as number) || 0,
        depositCount: (result?.deposit_count as number) || 0,
      });
    }

    return error("Not found", 404);
  },
};
