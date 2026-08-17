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
