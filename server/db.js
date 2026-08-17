import initSqlJs from "sql.js";
import { readFileSync, writeFileSync, existsSync, mkdirSync } from "fs";
import { dirname } from "path";

let dbInstance = null;

export async function getDb(dbPath) {
  if (dbInstance) return dbInstance;

  const SQL = await initSqlJs();
  mkdirSync(dirname(dbPath), { recursive: true });

  if (existsSync(dbPath)) {
    const buf = readFileSync(dbPath);
    dbInstance = new SQL.Database(buf);
  } else {
    dbInstance = new SQL.Database();
  }

  migrate(dbInstance);
  flushToDisk(dbInstance, dbPath);

  return dbInstance;
}

function flushToDisk(database, dbPath) {
  try {
    const data = database.export();
    writeFileSync(dbPath, Buffer.from(data));
  } catch (err) {
    console.error("[DB] save error:", err.message);
  }
}

export function flushDb(dbPath) {
  if (dbInstance) flushToDisk(dbInstance, dbPath);
}

export function getDbSync() {
  if (!dbInstance) throw new Error("Database not initialized");
  return dbInstance;
}

function migrate(db) {
  db.run(`CREATE TABLE IF NOT EXISTS diamond_packages (
    id TEXT PRIMARY KEY, name TEXT NOT NULL, price_usd REAL NOT NULL,
    diamonds INTEGER NOT NULL, active INTEGER NOT NULL DEFAULT 1
  )`);
  db.run(`CREATE TABLE IF NOT EXISTS player_diamonds (
    user_id TEXT PRIMARY KEY, balance INTEGER NOT NULL DEFAULT 0,
    updated_at TEXT NOT NULL DEFAULT (datetime('now'))
  )`);
  db.run(`CREATE TABLE IF NOT EXISTS payments (
    id TEXT PRIMARY KEY, user_id TEXT NOT NULL, package_id TEXT NOT NULL,
    provider TEXT NOT NULL DEFAULT 'nowpayments', provider_payment_id TEXT,
    price_usd REAL NOT NULL, pay_currency TEXT, pay_amount TEXT,
    pay_address TEXT, pay_network TEXT, status TEXT NOT NULL DEFAULT 'created',
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now')), completed_at TEXT
  )`);
  db.run(`CREATE TABLE IF NOT EXISTS payment_events (
    id INTEGER PRIMARY KEY AUTOINCREMENT, payment_id TEXT NOT NULL,
    provider_status TEXT NOT NULL, payload TEXT,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  )`);

  const packages = [
    { id: "initial", name: "Inicial", price_usd: 0.99, diamonds: 80 },
    { id: "basic", name: "Básico", price_usd: 4.99, diamonds: 420 },
    { id: "farmer", name: "Granjero", price_usd: 9.99, diamonds: 900 },
    { id: "big", name: "Grande", price_usd: 19.99, diamonds: 2000 },
    { id: "premium", name: "Premium", price_usd: 49.99, diamonds: 5500 },
    { id: "mega", name: "Mega", price_usd: 99.99, diamonds: 12000 },
  ];
  for (const p of packages) {
    db.run(`INSERT OR REPLACE INTO diamond_packages (id, name, price_usd, diamonds, active) VALUES (?, ?, ?, ?, 1)`,
      [p.id, p.name, p.price_usd, p.diamonds]);
  }
}
