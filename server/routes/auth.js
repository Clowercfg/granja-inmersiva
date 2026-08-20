import { Router } from "express";
import crypto from "crypto";
import { getDb, saveDb } from "../db.js";
import { validateTelegramInitData, parseTelegramUser, parseStartParam } from "../services/telegramAuth.js";
import { ensurePlayer } from "../services/affiliateEngine.js";
import { rateLimit, optionalAuth, requireAuth } from "../middleware/auth.js";

const SESSION_DURATION_MS = 30 * 24 * 60 * 60 * 1000; // 30 days

function genToken() {
  return crypto.randomBytes(32).toString("hex");
}

function genUserId() {
  return crypto.randomUUID ? crypto.randomUUID() : `u-${Date.now()}-${crypto.randomBytes(4).toString("hex")}`;
}

function now() {
  return new Date().toISOString();
}

export function createAuthRouter(dbPath) {
  const router = Router();

  /**
   * POST /api/auth/telegram
   * Body: { initData: string }
   *
   * Validates Telegram initData, upserts user, creates session.
   * Returns: { token, user: { id, firstName, lastName, username, photoUrl, role } }
   */
  router.post("/auth/telegram", (req, res) => {
    const db = getDb();
    if (!db) return res.status(500).json({ error: "database_unavailable" });

    // Rate limiting
    const ip = req.ip || req.connection?.remoteAddress || "unknown";
    if (!rateLimit(ip)) {
      return res.status(429).json({ error: "rate_limited", message: "Too many attempts. Try again in 1 minute." });
    }

    const { initData } = req.body || {};
    if (!initData) {
      return res.status(400).json({ error: "missing_initData" });
    }

    // --- DEV MODE: bypass validation if BOT_TOKEN not set ---
    const botToken = process.env.BOT_TOKEN;
    let telegramUser;

    if (!botToken) {
      // DEV MODE: parse user from initData or use default
      try {
        const params = new URLSearchParams(initData);
        const userJson = params.get("user");
        telegramUser = userJson ? JSON.parse(userJson) : null;
      } catch { /* ignore */ }

      if (!telegramUser) {
        // Minimal dev fallback
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
      const validation = validateTelegramInitData(initData, botToken);
      if (!validation.ok) {
        return res.status(401).json({ error: validation.error });
      }
      telegramUser = parseTelegramUser(validation.data);
      if (!telegramUser || !telegramUser.id) {
        return res.status(401).json({ error: "invalid_user_data" });
      }
    }

    const telegramId = String(telegramUser.id);
    const firstName = telegramUser.first_name || "";
    const lastName = telegramUser.last_name || "";
    const username = telegramUser.username || "";
    const photoUrl = telegramUser.photo_url || "";
    const languageCode = telegramUser.language_code || "es";

    // Upsert user
    let user;
    const existing = db.prepare("SELECT * FROM users WHERE telegram_id = ?");
    existing.bind([telegramId]);
    if (existing.step()) {
      const row = existing.getAsObject();
      user = {
        id: row.id,
        telegramId: row.telegram_id,
        firstName: row.first_name,
        role: row.role,
        status: row.status,
      };
      // Update info
      db.run(
        `UPDATE users SET first_name = ?, last_name = ?, username = ?, photo_url = ?, language_code = ?, last_login_at = datetime('now')
         WHERE telegram_id = ?`,
        [firstName, lastName, username, photoUrl, languageCode, telegramId]
      );
    } else {
      // New user
      const userId = genUserId();
      db.run(
        `INSERT INTO users (id, telegram_id, first_name, last_name, username, photo_url, language_code, role, status, created_at, last_login_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, 'player', 'active', datetime('now'), datetime('now'))`,
        [userId, telegramId, firstName, lastName, username, photoUrl, languageCode]
      );
      user = { id: userId, telegramId, firstName, role: "player", status: "active" };

      // Auto-register in affiliate system (use userId as player_name for uniqueness)
      ensurePlayer(db, userId);
    }
    existing.free();

    // Create session token
    const token = genToken();
    const expiresAt = new Date(Date.now() + SESSION_DURATION_MS).toISOString();
    db.run(
      `INSERT INTO sessions (token, user_id, created_at, expires_at) VALUES (?, ?, datetime('now'), ?)`,
      [token, user.id, expiresAt]
    );

    // Audit log
    db.run(
      `INSERT INTO auth_audit_log (event, user_id, ip, details, created_at) VALUES (?, ?, ?, ?, datetime('now'))`,
      ["login", user.id, ip, JSON.stringify({ firstName, username })]
    );

    saveDb(dbPath);

    res.json({
      token,
      user: {
        id: user.id,
        firstName,
        lastName,
        username,
        photoUrl,
        languageCode,
        role: user.role,
      },
    });
  });

  /**
   * GET /api/me
   * Returns current user from session token.
   */
  router.get("/me", optionalAuth, (req, res) => {
    if (!req.user) {
      return res.status(401).json({ error: "not_authenticated" });
    }
    res.json({
      user: {
        id: req.user.id,
        firstName: req.user.firstName,
        lastName: req.user.lastName,
        username: req.user.username,
        photoUrl: req.user.photoUrl,
        languageCode: req.user.languageCode,
        role: req.user.role,
      },
    });
  });

  /**
   * POST /api/auth/logout
   * Invalidates session.
   */
  router.post("/auth/logout", optionalAuth, (req, res) => {
    if (!req.userId) {
      return res.json({ ok: true });
    }

    const authHeader = req.headers.authorization;
    const token = authHeader?.startsWith("Bearer ") ? authHeader.slice(7).trim() : null;

    if (token) {
      const db = getDb();
      db.run("DELETE FROM sessions WHERE token = ?", [token]);
      saveDb(dbPath);
    }

    res.json({ ok: true });
  });

  /**
   * GET /api/auth/dev-login
   * DEV MODE ONLY: bypass Telegram validation.
   * Creates a user with telegram_id=0 and returns a session.
   */
  router.get("/auth/dev-login", (req, res) => {
    if (process.env.BOT_TOKEN) {
      return res.status(403).json({ error: "dev_mode_disabled" });
    }

    const db = getDb();
    const telegramId = "0";
    const firstName = "DevPlayer";
    const username = "devplayer";

    // Upsert dev user
    const existing = db.prepare("SELECT id FROM users WHERE telegram_id = ?");
    existing.bind([telegramId]);
    let userId;
    if (existing.step()) {
      userId = existing.getAsObject().id;
      db.run(
        `UPDATE users SET last_login_at = datetime('now') WHERE telegram_id = ?`,
        [telegramId]
      );
    } else {
      userId = genUserId();
      db.run(
        `INSERT INTO users (id, telegram_id, first_name, last_name, username, photo_url, language_code, role, status, created_at, last_login_at)
         VALUES (?, ?, ?, '', '', '', 'es', 'player', 'active', datetime('now'), datetime('now'))`,
        [userId, telegramId, firstName]
      );
    }
    existing.free();

    // Auto-register in affiliate (use userId for uniqueness)
    ensurePlayer(db, userId);

    // Create session
    const token = genToken();
    const expiresAt = new Date(Date.now() + SESSION_DURATION_MS).toISOString();
    db.run(
      `INSERT INTO sessions (token, user_id, created_at, expires_at) VALUES (?, ?, datetime('now'), ?)`,
      [token, userId, expiresAt]
    );

    saveDb(dbPath);

    res.json({
      token,
      user: {
        id: userId,
        firstName,
        lastName: "",
        username,
        photoUrl: "",
        languageCode: "es",
        role: "player",
      },
    });
  });

  return router;
}
