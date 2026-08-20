import { Router } from "express";
import { getDb, saveDb } from "../db.js";
import { optionalAuth, requireAuth } from "../middleware/auth.js";

export function createDepositsRouter(dbPath) {
  const router = Router();

  /**
   * GET /api/deposit/config
   * Returns wallet address, network, and telegram contact.
   */
  router.get("/deposit/config", (req, res) => {
    res.json({
      walletAddress: process.env.WALLET_ADDRESS || "",
      network: process.env.WALLET_NETWORK || "",
      telegram: process.env.TELEGRAM || "",
    });
  });

  /**
   * GET /api/deposits/player/me
   * Returns all completed deposits for the authenticated user.
   */
  router.get("/deposits/player/me", optionalAuth, requireAuth, (req, res) => {
    const db = getDb();
    const stmt = db.prepare(
      "SELECT id, amount, currency, network, tx_hash, confirmed_at FROM deposits WHERE player_name = ? AND status = 'completed' ORDER BY confirmed_at DESC"
    );
    stmt.bind([req.userId]);
    const rows = [];
    while (stmt.step()) {
      const r = stmt.getAsObject();
      rows.push({
        id: r.id,
        amount: r.amount,
        currency: r.currency,
        network: r.network,
        txHash: r.tx_hash,
        confirmedAt: r.confirmed_at,
      });
    }
    stmt.free();
    res.json({ deposits: rows });
  });

  /**
   * POST /api/admin/deposits
   * Body: { playerName, amount, currency, network, txHash, adminName }
   * Confirm a deposit. TX Hash must be unique.
   */
  router.post("/admin/deposits", (req, res) => {
    const db = getDb();
    const { playerName, amount, currency, network, txHash, adminName } = req.body || {};

    if (!playerName || !amount || !currency || !network || !txHash || !adminName) {
      return res.status(400).json({ error: "All fields are required" });
    }

    const numAmount = parseFloat(amount);
    if (isNaN(numAmount) || numAmount <= 0) {
      return res.status(400).json({ error: "Invalid amount" });
    }

    const txHashClean = txHash.trim();

    // Check TX Hash uniqueness
    const check = db.prepare("SELECT id FROM deposits WHERE tx_hash = ?");
    check.bind([txHashClean]);
    if (check.step()) {
      check.free();
      return res.status(409).json({ error: "Esta transacción ya fue registrada." });
    }
    check.free();

    // Insert deposit
    db.run(
      `INSERT INTO deposits (player_name, amount, currency, network, tx_hash, status, confirmed_by, confirmed_at)
       VALUES (?, ?, ?, ?, ?, 'completed', ?, datetime('now'))`,
      [playerName.trim(), numAmount, currency, network, txHashClean, adminName.trim()]
    );
    saveDb(dbPath);

    // Get the inserted deposit
    const stmt = db.prepare("SELECT * FROM deposits WHERE tx_hash = ?");
    stmt.bind([txHashClean]);
    let deposit = null;
    if (stmt.step()) {
      deposit = stmt.getAsObject();
    }
    stmt.free();

    res.json({
      ok: true,
      deposit: {
        id: deposit.id,
        playerName: deposit.player_name,
        amount: deposit.amount,
        currency: deposit.currency,
        network: deposit.network,
        txHash: deposit.tx_hash,
        confirmedBy: deposit.confirmed_by,
        confirmedAt: deposit.confirmed_at,
      },
    });
  });

  /**
   * GET /api/admin/deposits
   * List recent deposits (admin panel).
   */
  router.get("/admin/deposits", (req, res) => {
    const db = getDb();
    const limit = Math.min(parseInt(req.query.limit) || 50, 200);
    const stmt = db.prepare(
      "SELECT id, player_name, amount, currency, network, tx_hash, confirmed_by, confirmed_at FROM deposits ORDER BY confirmed_at DESC LIMIT ?"
    );
    stmt.bind([limit]);
    const rows = [];
    while (stmt.step()) {
      const r = stmt.getAsObject();
      rows.push({
        id: r.id,
        playerName: r.player_name,
        amount: r.amount,
        currency: r.currency,
        network: r.network,
        txHash: r.tx_hash,
        confirmedBy: r.confirmed_by,
        confirmedAt: r.confirmed_at,
      });
    }
    stmt.free();
    res.json({ deposits: rows });
  });

  /**
   * GET /api/admin/player/:name
   * Get player deposit summary.
   */
  router.get("/admin/player/:name", (req, res) => {
    const db = getDb();
    const name = req.params.name?.trim();
    if (!name) return res.status(400).json({ error: "Player name required" });

    const stmt = db.prepare(
      "SELECT SUM(amount) as total_deposited, COUNT(*) as deposit_count FROM deposits WHERE player_name = ? AND status = 'completed'"
    );
    stmt.bind([name]);
    let result = { totalDeposited: 0, depositCount: 0 };
    if (stmt.step()) {
      const r = stmt.getAsObject();
      result = {
        totalDeposited: r.total_deposited || 0,
        depositCount: r.deposit_count || 0,
      };
    }
    stmt.free();
    res.json(result);
  });

  return router;
}
