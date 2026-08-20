import crypto from "crypto";

/**
 * Telegram Mini App initData validation.
 * Uses HMAC-SHA-256 as documented by Telegram:
 * https://core.telegram.org/bots/webapps#validating-data-received-via-the-mini-app
 *
 * initData is a query string: key=value pairs separated by &
 * The last param is `hash` (HMAC-SHA-256).
 * Secret key = HMAC-SHA-256("WebAppData", botToken).
 *
 * @param {string} initDataRaw - raw initData string from Telegram.WebApp.initData
 * @param {string} botToken - Telegram bot token (from env)
 * @param {number} [maxAgeMs=86400000] - max age of auth_date (default 24h)
 * @returns {{ ok: boolean, data?: Record<string,string>, error?: string }}
 */
export function validateTelegramInitData(initDataRaw, botToken, maxAgeMs = 86400000) {
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

  // Remove hash from params for validation
  params.delete("hash");

  // Build data_check_string: sorted key=value pairs joined by \n
  const dataCheckString = Array.from(params.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([k, v]) => `${k}=${v}`)
    .join("\n");

  // Secret key = HMAC-SHA-256("WebAppData", botToken)
  const secretKey = crypto
    .createHmac("sha256", "WebAppData")
    .update(botToken)
    .digest();

  // Compute expected hash
  const expectedHash = crypto
    .createHmac("sha256", secretKey)
    .update(dataCheckString)
    .digest("hex");

  // Timing-safe comparison
  if (expectedHash.length !== hash.length) {
    return { ok: false, error: "invalid_hash" };
  }
  const a = Buffer.from(expectedHash, "hex");
  const b = Buffer.from(hash, "hex");
  if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) {
    return { ok: false, error: "invalid_hash" };
  }

  // Check auth_date freshness
  const authDate = params.get("auth_date");
  if (!authDate) {
    return { ok: false, error: "missing_auth_date" };
  }
  const authTs = parseInt(authDate, 10);
  if (isNaN(authTs)) {
    return { ok: false, error: "invalid_auth_date" };
  }
  const now = Math.floor(Date.now() / 1000);
  if (now - authTs > Math.floor(maxAgeMs / 1000)) {
    return { ok: false, error: "auth_date_expired" };
  }

  // Parse all data
  const data = {};
  for (const [k, v] of params.entries()) {
    data[k] = v;
  }

  return { ok: true, data };
}

/**
 * Parse Telegram user info from initData.
 * Telegram puts user info in the `user` field as JSON.
 * @param {Record<string,string>} validatedData - from validateTelegramInitData
 * @returns {{ id, first_name, last_name?, username?, language_code?, photo_url? } | null}
 */
export function parseTelegramUser(validatedData) {
  if (!validatedData || !validatedData.user) return null;
  try {
    return JSON.parse(validatedData.user);
  } catch {
    return null;
  }
}

/**
 * Parse Telegram start_param (deep link referral code) from initData.
 */
export function parseStartParam(validatedData) {
  if (!validatedData || !validatedData.start_param) return null;
  const code = validatedData.start_param.trim();
  if (code.length < 3 || code.length > 64) return null;
  return code;
}
