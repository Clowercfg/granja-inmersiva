-- Migration 001: Create deposits table
CREATE TABLE IF NOT EXISTS deposits (
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
);
