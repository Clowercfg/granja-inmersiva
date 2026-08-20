import { getDb } from "../db.js";

/**
 * Rate limiter: simple in-memory sliding window per IP.
 */
const loginAttempts = new Map();

export function rateLimit(ip, maxAttempts = 5, windowMs = 60000) {
  const now = Date.now();
  const entry = loginAttempts.get(ip);
  if (!entry || now - entry.windowStart > windowMs) {
    loginAttempts.set(ip, { windowStart: now, count: 1 });
    return true;
  }
  entry.count++;
  if (entry.count > maxAttempts) return false;
  return true;
}

/**
 * Auth middleware: reads Authorization: Bearer <token>, looks up session,
 * sets req.userId and req.user.
 *
 * Does NOT block — if no token or invalid, req.userId = null.
 */
export function optionalAuth(req, res, next) {
  const db = getDb();
  if (!db) {
    req.userId = null;
    req.user = null;
    return next();
  }

  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    req.userId = null;
    req.user = null;
    return next();
  }

  const token = authHeader.slice(7).trim();
  if (!token || token.length < 10) {
    req.userId = null;
    req.user = null;
    return next();
  }

  try {
    const stmt = db.prepare(
      `SELECT s.user_id, s.expires_at,
              u.id, u.telegram_id, u.first_name, u.last_name, u.username, u.photo_url, u.language_code, u.role, u.status
       FROM sessions s
       JOIN users u ON s.user_id = u.id
       WHERE s.token = ? AND u.status = 'active'`
    );
    stmt.bind([token]);

    if (stmt.step()) {
      const row = stmt.getAsObject();
      // Check expiry
      if (row.expires_at) {
        const expiresAt = new Date(row.expires_at).getTime();
        if (Date.now() > expiresAt) {
          stmt.free();
          req.userId = null;
          req.user = null;
          return next();
        }
      }
      req.userId = row.user_id || row.id;
      req.user = {
        id: row.id || row.user_id,
        telegramId: row.telegram_id,
        firstName: row.first_name,
        lastName: row.last_name || "",
        username: row.username || "",
        photoUrl: row.photo_url || "",
        languageCode: row.language_code || "",
        role: row.role,
        status: row.status,
      };
    } else {
      req.userId = null;
      req.user = null;
    }
    stmt.free();
  } catch {
    req.userId = null;
    req.user = null;
  }

  next();
}

/**
 * Required auth middleware: blocks with 401 if no valid session.
 */
export function requireAuth(req, res, next) {
  if (!req.userId) {
    return res.status(401).json({ error: "unauthorized", message: "Session required" });
  }
  next();
}
