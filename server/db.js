import initSqlJs from "sql.js";
import { readFileSync, existsSync, writeFileSync } from "fs";
import { dirname, join } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));

let db = null;

export async function initDb(dbPath) {
  const SQL = await initSqlJs();
  const dir = dirname(dbPath);
  if (!existsSync(dir)) {
    const { mkdirSync } = await import("fs");
    mkdirSync(dir, { recursive: true });
  }

  if (existsSync(dbPath)) {
    const buf = readFileSync(dbPath);
    db = new SQL.Database(buf);
  } else {
    db = new SQL.Database();
  }

  db.run(`CREATE TABLE IF NOT EXISTS deposits (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    player_name TEXT NOT NULL,
    amount REAL NOT NULL,
    currency TEXT NOT NULL,
    network TEXT NOT NULL,
    tx_hash TEXT NOT NULL UNIQUE,
    status TEXT NOT NULL DEFAULT 'completed',
    confirmed_by TEXT NOT NULL,
    confirmed_at TEXT NOT NULL DEFAULT (datetime('now')),
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  )`);

  // ─── Affiliate System Tables ───

  db.run(`CREATE TABLE IF NOT EXISTS affiliate_players (
    player_name TEXT PRIMARY KEY,
    affiliate_code TEXT NOT NULL UNIQUE,
    referred_by TEXT,
    status TEXT NOT NULL DEFAULT 'active',
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now')),
    FOREIGN KEY (referred_by) REFERENCES affiliate_players(player_name)
  )`);

  db.run(`CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,
    telegram_id TEXT NOT NULL UNIQUE,
    first_name TEXT NOT NULL DEFAULT '',
    last_name TEXT NOT NULL DEFAULT '',
    username TEXT NOT NULL DEFAULT '',
    photo_url TEXT NOT NULL DEFAULT '',
    language_code TEXT NOT NULL DEFAULT 'es',
    role TEXT NOT NULL DEFAULT 'player',
    status TEXT NOT NULL DEFAULT 'active',
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    last_login_at TEXT
  )`);

  db.run(`CREATE INDEX IF NOT EXISTS idx_users_telegram_id ON users(telegram_id)`);
  db.run(`CREATE INDEX IF NOT EXISTS idx_users_status ON users(status)`);

  db.run(`CREATE TABLE IF NOT EXISTS sessions (
    token TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    expires_at TEXT NOT NULL,
    FOREIGN KEY (user_id) REFERENCES users(id)
  )`);

  db.run(`CREATE INDEX IF NOT EXISTS idx_sessions_user_id ON sessions(user_id)`);
  db.run(`CREATE INDEX IF NOT EXISTS idx_sessions_expires_at ON sessions(expires_at)`);

  db.run(`CREATE TABLE IF NOT EXISTS auth_audit_log (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    event TEXT NOT NULL,
    user_id TEXT,
    ip TEXT,
    details TEXT DEFAULT '',
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  )`);

  db.run(`CREATE INDEX IF NOT EXISTS idx_auth_audit_event ON auth_audit_log(event)`);
  db.run(`CREATE INDEX IF NOT EXISTS idx_auth_audit_user ON auth_audit_log(user_id)`);

  db.run(`CREATE INDEX IF NOT EXISTS idx_affiliate_players_code ON affiliate_players(affiliate_code)`);
  db.run(`CREATE INDEX IF NOT EXISTS idx_affiliate_players_referred_by ON affiliate_players(referred_by)`);

  db.run(`CREATE TABLE IF NOT EXISTS affiliate_commission_transactions (
    id TEXT PRIMARY KEY,
    beneficiary_user_id TEXT NOT NULL,
    source_user_id TEXT NOT NULL,
    source_profit_tx_id TEXT NOT NULL,
    affiliate_level INTEGER NOT NULL,
    commission_rate REAL NOT NULL,
    eligible_profit REAL NOT NULL,
    commission_amount REAL NOT NULL,
    currency TEXT NOT NULL DEFAULT 'USD',
    status TEXT NOT NULL DEFAULT 'pending',
    description TEXT DEFAULT '',
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    settled_at TEXT
  )`);

  db.run(`CREATE UNIQUE INDEX IF NOT EXISTS idx_commission_idempotency
    ON affiliate_commission_transactions(source_profit_tx_id, beneficiary_user_id, affiliate_level)`);
  db.run(`CREATE INDEX IF NOT EXISTS idx_commission_beneficiary ON affiliate_commission_transactions(beneficiary_user_id)`);
  db.run(`CREATE INDEX IF NOT EXISTS idx_commission_source ON affiliate_commission_transactions(source_user_id)`);
  db.run(`CREATE INDEX IF NOT EXISTS idx_commission_status ON affiliate_commission_transactions(status)`);

  db.run(`CREATE TABLE IF NOT EXISTS affiliate_profit_events (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    source_player TEXT NOT NULL,
    transaction_id TEXT NOT NULL UNIQUE,
    eligible_profit REAL NOT NULL,
    description TEXT DEFAULT '',
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  )`);

  db.run(`CREATE TABLE IF NOT EXISTS affiliate_audit_log (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    event TEXT NOT NULL,
    user_name TEXT NOT NULL,
    details TEXT DEFAULT '',
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  )`);

  db.run(`CREATE INDEX IF NOT EXISTS idx_audit_event ON affiliate_audit_log(event)`);
  db.run(`CREATE INDEX IF NOT EXISTS idx_audit_user ON affiliate_audit_log(user_name)`);

  saveDb(dbPath);
  return db;
}

export function getDb() {
  return db;
}

export function saveDb(dbPath) {
  if (!db) return;
  const data = db.export();
  const buffer = Buffer.from(data);
  writeFileSync(dbPath, buffer);
}
