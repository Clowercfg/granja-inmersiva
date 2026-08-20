/**
 * Granja Inmersiva API — Cloudflare Worker
 * Uses D1 for database, KV for config.
 * Admin endpoints protected by HMAC token with expiration.
 * Telegram Mini App auth with HMAC-SHA-256 validation.
 */

export interface Env {
  DB: D1Database;
  R2?: R2Bucket;
  KV: KVNamespace;
  ASSETS: Fetcher;
  WALLET_ADDRESS: string;
  WALLET_NETWORK: string;
  TELEGRAM: string;
  ADMIN_SECRET: string;
  BOT_TOKEN: string;
}

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
};

const SESSION_TTL_MS = 30 * 24 * 60 * 60 * 1000; // 30 days
const AUTH_RATE_LIMIT_MS = 60_000;
const AUTH_RATE_LIMIT_MAX = 5;
const MAX_DEPOSIT_AMOUNT = 1_000_000;

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
  if (!entry || now - entry.windowStart > AUTH_RATE_LIMIT_MS) {
    loginAttempts.set(ip, { count: 1, windowStart: now });
    return false;
  }
  entry.count++;
  return entry.count > AUTH_RATE_LIMIT_MAX;
}

// ─── HMAC helpers ───

async function hmacHex(secret: string, message: string): Promise<string> {
  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey(
    "raw", encoder.encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]
  );
  const sig = await crypto.subtle.sign("HMAC", key, encoder.encode(message));
  return Array.from(new Uint8Array(sig)).map(b => b.toString(16).padStart(2, "0")).join("");
}

async function hmacKeyRaw(secret: string): Promise<CryptoKey> {
  const encoder = new TextEncoder();
  return crypto.subtle.importKey(
    "raw", encoder.encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]
  );
}

// ─── Admin auth ───

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

  const expectedSig = await hmacHex(env.ADMIN_SECRET, tsStr);
  return timingSafeEqual(receivedSig, expectedSig);
}

// ─── Telegram auth ───

function generateId(): string {
  const arr = new Uint8Array(16);
  crypto.getRandomValues(arr);
  return Array.from(arr).map(b => b.toString(16).padStart(2, "0")).join("");
}

/**
 * Validate Telegram Mini App initData per official spec:
 * https://core.telegram.org/bots/webapps#validating-data-received-via-the-mini-app
 */
async function validateTelegramInitData(
  initDataRaw: string,
  botToken: string,
  maxAgeSec = 86400
): Promise<{ ok: boolean; data?: Record<string, string>; error?: string }> {
  if (!initDataRaw || typeof initDataRaw !== "string") {
    return { ok: false, error: "missing_initData" };
  }
  if (!botToken) {
    return { ok: false, error: "missing_bot_token" };
  }

  const params = new URLSearchParams(initDataRaw);
  const hash = params.get("hash");
  if (!hash) {
    return { ok: false, error: "missing_hash" };
  }

  params.delete("hash");

  const dataCheckString = Array.from(params.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([k, v]) => `${k}=${v}`)
    .join("\n");

  // Secret key = HMAC-SHA-256("WebAppData", botToken)
  const encoder = new TextEncoder();
  const webAppDataKey = await crypto.subtle.importKey(
    "raw", encoder.encode("WebAppData"), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]
  );
  const secretKeyBytes = await crypto.subtle.sign("HMAC", webAppDataKey, encoder.encode(botToken));

  const secretKey = await crypto.subtle.importKey(
    "raw", secretKeyBytes, { name: "HMAC", hash: "SHA-256" }, false, ["sign"]
  );
  const expectedSigBytes = await crypto.subtle.sign("HMAC", secretKey, encoder.encode(dataCheckString));
  const expectedHash = Array.from(new Uint8Array(expectedSigBytes))
    .map(b => b.toString(16).padStart(2, "0")).join("");

  if (!timingSafeEqual(expectedHash, hash)) {
    return { ok: false, error: "invalid_hash" };
  }

  const authDate = params.get("auth_date");
  if (!authDate) {
    return { ok: false, error: "missing_auth_date" };
  }
  const authTs = parseInt(authDate, 10);
  if (isNaN(authTs)) {
    return { ok: false, error: "invalid_auth_date" };
  }
  const now = Math.floor(Date.now() / 1000);
  if (now - authTs > maxAgeSec) {
    return { ok: false, error: "auth_date_expired" };
  }

  const data: Record<string, string> = {};
  for (const [k, v] of params.entries()) {
    data[k] = v;
  }

  return { ok: true, data };
}

async function resolveSessionUser(
  request: Request,
  db: D1Database
): Promise<{ userId: string; user: any } | null> {
  const auth = request.headers.get("Authorization");
  if (!auth?.startsWith("Bearer ")) return null;
  const token = auth.slice(7).trim();
  if (!token || token.length < 10) return null;

  const row = await db.prepare(
    `SELECT s.user_id, s.expires_at,
            u.id, u.telegram_id, u.first_name, u.last_name, u.username, u.photo_url, u.language_code, u.role, u.status
     FROM sessions s
     JOIN users u ON s.user_id = u.id
     WHERE s.token = ?1 AND u.status = 'active'`
  ).bind(token).first();

  if (!row) return null;
  if (row.expires_at && new Date(row.expires_at as string).getTime() < Date.now()) return null;

  return {
    userId: row.user_id as string,
    user: {
      id: row.id,
      firstName: row.first_name,
      lastName: row.last_name || "",
      username: row.username || "",
      photoUrl: row.photo_url || "",
      languageCode: row.language_code || "",
      role: row.role,
    },
  };
}

// ─── DB init ───

async function initDb(db: D1Database) {
  await db.exec(`CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,
    telegram_id TEXT NOT NULL UNIQUE,
    first_name TEXT DEFAULT '',
    last_name TEXT DEFAULT '',
    username TEXT DEFAULT '',
    photo_url TEXT DEFAULT '',
    language_code TEXT DEFAULT 'es',
    role TEXT DEFAULT 'player',
    status TEXT DEFAULT 'active',
    created_at TEXT DEFAULT (datetime('now')),
    last_login_at TEXT DEFAULT (datetime('now'))
  )`);

  await db.exec(`CREATE TABLE IF NOT EXISTS sessions (
    token TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    created_at TEXT DEFAULT (datetime('now')),
    expires_at TEXT,
    FOREIGN KEY (user_id) REFERENCES users(id)
  )`);

  await db.exec(`CREATE TABLE IF NOT EXISTS auth_audit_log (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    event TEXT NOT NULL,
    user_id TEXT,
    ip TEXT,
    details TEXT,
    created_at TEXT DEFAULT (datetime('now'))
  )`);

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

// ─── Main handler ───

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

    // ─── Telegram auth ───
    if (path === "/api/auth/telegram" && method === "POST") {
      const clientIP = request.headers.get("CF-Connecting-IP") || "unknown";
      if (isRateLimited(clientIP)) {
        return error("rate_limited", 429);
      }

      const body = await request.json().catch(() => ({})) as any;
      const { initData } = body || {};
      if (!initData) {
        return error("missing_initData", 400);
      }

      const botToken = env.BOT_TOKEN;
      let telegramUser: any;

      if (!botToken) {
        // DEV MODE: no bot token configured — parse user from initData or use fallback
        try {
          const params = new URLSearchParams(initData);
          const userJson = params.get("user");
          telegramUser = userJson ? JSON.parse(userJson) : null;
        } catch { /* ignore */ }

        if (!telegramUser) {
          telegramUser = {
            id: 12345678,
            first_name: "DevUser",
            last_name: "",
            username: "devuser",
            language_code: "es",
          };
        }
      } else {
        // PRODUCTION: validate HMAC
        const validation = await validateTelegramInitData(initData, botToken);
        if (!validation.ok) {
          return error(validation.error || "validation_failed", 401);
        }
        if (!validation.data?.user) {
          return error("invalid_user_data", 401);
        }
        try {
          telegramUser = JSON.parse(validation.data.user);
        } catch {
          return error("invalid_user_data", 401);
        }
      }

      if (!telegramUser?.id) {
        return error("invalid_user_data", 401);
      }

      const telegramId = String(telegramUser.id);
      const firstName = telegramUser.first_name || "";
      const lastName = telegramUser.last_name || "";
      const username = telegramUser.username || "";
      const photoUrl = telegramUser.photo_url || "";
      const languageCode = telegramUser.language_code || "es";

      // Upsert user
      const existing = await env.DB.prepare("SELECT id FROM users WHERE telegram_id = ?1")
        .bind(telegramId).first();

      let userId: string;
      if (existing) {
        userId = existing.id as string;
        await env.DB.prepare(
          `UPDATE users SET first_name = ?1, last_name = ?2, username = ?3, photo_url = ?4, language_code = ?5, last_login_at = datetime('now')
           WHERE telegram_id = ?6`
        ).bind(firstName, lastName, username, photoUrl, languageCode, telegramId).run();
      } else {
        userId = generateId();
        await env.DB.prepare(
          `INSERT INTO users (id, telegram_id, first_name, last_name, username, photo_url, language_code, role, status, created_at, last_login_at)
           VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, 'player', 'active', datetime('now'), datetime('now'))`
        ).bind(userId, telegramId, firstName, lastName, username, photoUrl, languageCode).run();
      }

      // Create session
      const sessionToken = generateId();
      const expiresAt = new Date(Date.now() + SESSION_TTL_MS).toISOString();
      await env.DB.prepare(
        `INSERT INTO sessions (token, user_id, created_at, expires_at) VALUES (?1, ?2, datetime('now'), ?3)`
      ).bind(sessionToken, userId, expiresAt).run();

      // Audit log
      await env.DB.prepare(
        `INSERT INTO auth_audit_log (event, user_id, ip, details, created_at) VALUES (?, ?, ?, ?, datetime('now'))`
      ).bind("login", userId, clientIP, JSON.stringify({ firstName, username })).run();

      return json({
        token: sessionToken,
        user: {
          id: userId,
          firstName,
          lastName,
          username,
          photoUrl,
          languageCode,
          role: "player",
        },
      });
    }

    // ─── GET /api/me ───
    if (path === "/api/me" && method === "GET") {
      const session = await resolveSessionUser(request, env.DB);
      if (!session) {
        return error("not_authenticated", 401);
      }
      return json({ user: session.user });
    }

    // ─── POST /api/auth/logout ───
    if (path === "/api/auth/logout" && method === "POST") {
      const auth = request.headers.get("Authorization");
      const token = auth?.startsWith("Bearer ") ? auth.slice(7).trim() : null;
      if (token && token.length >= 10) {
        await env.DB.prepare("DELETE FROM sessions WHERE token = ?1").bind(token).run();
      }
      return json({ ok: true });
    }

    // ─── GET /api/auth/dev-login ───
    if (path === "/api/auth/dev-login" && method === "GET") {
      if (env.BOT_TOKEN) {
        return error("dev_mode_disabled", 403);
      }

      const telegramId = "0";
      const firstName = "DevPlayer";

      const existing = await env.DB.prepare("SELECT id FROM users WHERE telegram_id = ?1")
        .bind(telegramId).first();

      let userId: string;
      if (existing) {
        userId = existing.id as string;
        await env.DB.prepare("UPDATE users SET last_login_at = datetime('now') WHERE telegram_id = ?1")
          .bind(telegramId).run();
      } else {
        userId = generateId();
        await env.DB.prepare(
          `INSERT INTO users (id, telegram_id, first_name, last_name, username, photo_url, language_code, role, status, created_at, last_login_at)
           VALUES (?1, ?2, ?3, '', '', '', 'es', 'player', 'active', datetime('now'), datetime('now'))`
        ).bind(userId, telegramId, firstName).run();
      }

      const sessionToken = generateId();
      const expiresAt = new Date(Date.now() + SESSION_TTL_MS).toISOString();
      await env.DB.prepare(
        `INSERT INTO sessions (token, user_id, created_at, expires_at) VALUES (?1, ?2, datetime('now'), ?3)`
      ).bind(sessionToken, userId, expiresAt).run();

      return json({
        token: sessionToken,
        user: {
          id: userId,
          firstName,
          lastName: "",
          username: "devplayer",
          photoUrl: "",
          languageCode: "es",
          role: "player",
        },
      });
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

    // ─── Admin: login ───
    if (path === "/api/admin/login" && method === "POST") {
      const clientIP = request.headers.get("CF-Connecting-IP") || "unknown";
      if (isRateLimited(clientIP)) {
        return error("Demasiados intentos. Espera 1 minuto.", 429);
      }

      const body = await request.json() as any;
      const { password } = body || {};
      if (!password) return error("Password required");

      const inputHash = await hmacHex(env.ADMIN_SECRET, password);
      const expectedHash = await hmacHex(env.ADMIN_SECRET, env.ADMIN_SECRET);

      if (!timingSafeEqual(inputHash, expectedHash)) {
        return error("Invalid password", 401);
      }

      const ts = Date.now().toString();
      const sig = await hmacHex(env.ADMIN_SECRET, ts);
      return json({ ok: true, token: ts + sig });
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
        return error("Cantidad invalida");
      }
      if (numAmount > MAX_DEPOSIT_AMOUNT) {
        return error(`Cantidad maxima: $${MAX_DEPOSIT_AMOUNT.toLocaleString()}`);
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

    // ─── Unmatched /api/* → 404 (not SPA fallback) ───
    if (path.startsWith("/api/")) {
      return error("Not found", 404);
    }

    // ─── Everything else → static assets (SPA) ───
    return env.ASSETS.fetch(request);
  },
};
