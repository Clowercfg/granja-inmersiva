import crypto from "crypto";
import { AFFILIATE_CONFIG as CFG } from "../config/affiliate.js";

/* ─── Helpers ─── */

function roundUsd(v) {
  return Math.round(v * 10 ** CFG.USD_DECIMALS) / 10 ** CFG.USD_DECIMALS;
}

function genCode() {
  const rand = crypto.randomBytes(3).toString("hex").toUpperCase();
  return `FARM-${rand}`;
}

function now() {
  return new Date().toISOString();
}

/* ─── DB helpers (sql.js pattern) ─── */

function queryOne(db, sql, params = []) {
  const stmt = db.prepare(sql);
  stmt.bind(params);
  let row = null;
  if (stmt.step()) {
    const cols = stmt.getColumnNames();
    const vals = stmt.get();
    row = {};
    cols.forEach((c, i) => (row[c] = vals[i]));
  }
  stmt.free();
  return row;
}

function queryAll(db, sql, params = []) {
  const stmt = db.prepare(sql);
  stmt.bind(params);
  const rows = [];
  while (stmt.step()) {
    const cols = stmt.getColumnNames();
    const vals = stmt.get();
    const row = {};
    cols.forEach((c, i) => (row[c] = vals[i]));
    rows.push(row);
  }
  stmt.free();
  return rows;
}

/* ═══════════════════════════════════════════
   PLAYER REGISTRATION / AFFILIATE CODE
   ═══════════════════════════════════════════ */

/**
 * Ensure a player row exists in affiliate_players.
 * Called on first interaction or registration.
 */
export function ensurePlayer(db, playerName) {
  const existing = queryOne(db, "SELECT * FROM affiliate_players WHERE player_name = ?", [playerName]);
  if (existing) return existing;

  let code = genCode();
  // Retry on collision (extremely unlikely but safe)
  for (let i = 0; i < 5; i++) {
    const dup = queryOne(db, "SELECT 1 FROM affiliate_players WHERE affiliate_code = ?", [code]);
    if (!dup) break;
    code = genCode();
  }

  db.run(
    `INSERT OR IGNORE INTO affiliate_players (player_name, affiliate_code, status, created_at, updated_at)
     VALUES (?, ?, 'active', datetime('now'), datetime('now'))`,
    [playerName, code]
  );
  return queryOne(db, "SELECT * FROM affiliate_players WHERE player_name = ?", [playerName]);
}

/**
 * Get or create affiliate player.
 */
export function getOrCreatePlayer(db, playerName) {
  return ensurePlayer(db, playerName);
}

/* ═══════════════════════════════════════════
   REFERRAL REGISTRATION
   ═══════════════════════════════════════════ */

/**
 * Validate a referral code and set up the relationship.
 * Returns { ok, error?, referrer? }
 */
export function registerReferral(db, newPlayerName, referralCode) {
  if (!newPlayerName || !referralCode) {
    return { ok: false, error: "missing_fields" };
  }

  const cleanCode = referralCode.trim().toUpperCase();
  const referrer = queryOne(db, "SELECT * FROM affiliate_players WHERE affiliate_code = ?", [cleanCode]);

  if (!referrer) {
    return { ok: false, error: "invalid_code" };
  }

  if (referrer.status !== "active") {
    return { ok: false, error: "referrer_inactive" };
  }

  // Ensure the new player exists
  const newPlayer = ensurePlayer(db, newPlayerName);

  // Self-referral check
  if (newPlayer.player_name === referrer.player_name) {
    return { ok: false, error: "self_referral" };
  }

  // Already has a referrer?
  if (newPlayer.referred_by) {
    return { ok: false, error: "already_referred" };
  }

  // Cycle detection: walk ancestors from referrer up to root
  if (hasCycle(db, referrer.player_name, newPlayer.player_name)) {
    return { ok: false, error: "cycle_detected" };
  }

  // Set the relationship
  db.run(
    `UPDATE affiliate_players SET referred_by = ?, updated_at = datetime('now') WHERE player_name = ?`,
    [referrer.player_name, newPlayer.player_name]
  );

  return { ok: true, referrer: { name: referrer.player_name, code: referrer.affiliate_code } };
}

/**
 * Walk up from `startAncestor` and check if `candidate` appears.
 * If candidate appears, setting candidate.referred_by = startAncestor would create a cycle.
 */
function hasCycle(db, startAncestor, candidate) {
  let current = startAncestor;
  const visited = new Set();
  while (current) {
    if (visited.has(current)) break; // safety
    visited.add(current);
    if (current === candidate) return true;
    const row = queryOne(db, "SELECT referred_by FROM affiliate_players WHERE player_name = ?", [current]);
    current = row ? row.referred_by : null;
  }
  return false;
}

/* ═══════════════════════════════════════════
   ANCESTRY CHAIN (upward walk)
   ═══════════════════════════════════════════ */

/**
 * Returns an ordered array of ancestors from level 1 (direct sponsor) to level N.
 * Each element: { player_name, level }
 */
export function getAncestors(db, playerName) {
  const ancestors = [];
  let current = playerName;
  const maxIter = CFG.maxDepth + 1; // safety limit

  for (let i = 0; i < maxIter; i++) {
    const row = queryOne(db, "SELECT referred_by FROM affiliate_players WHERE player_name = ?", [current]);
    if (!row || !row.referred_by) break;
    ancestors.push({ player_name: row.referred_by, level: ancestors.length + 1 });
    current = row.referred_by;
  }

  return ancestors;
}

/* ═══════════════════════════════════════════
   COMMISSION CALCULATION
   ═══════════════════════════════════════════ */

/**
 * Process a profit event. Server-authoritative.
 * 
 * @param {object} db - sql.js database
 * @param {string} sourcePlayerName - player who generated the profit
 * @param {string} sourceTransactionId - unique profit event ID (idempotency key)
 * @param {number} eligibleProfit - net eligible profit in USD (must be > 0)
 * @param {string} [profitDescription] - optional description
 * @returns {{ ok, commissions: [], totalDistributed }}
 */
export function processProfitEvent(db, sourcePlayerName, sourceTransactionId, eligibleProfit, profitDescription = "") {
  // Validate input
  if (!sourcePlayerName || !sourceTransactionId) {
    return { ok: false, error: "missing_fields", commissions: [], totalDistributed: 0 };
  }

  const profit = Number(eligibleProfit);
  if (isNaN(profit) || profit <= 0) {
    // No commission on zero or negative profit
    return { ok: true, commissions: [], totalDistributed: 0, skipped: "non_positive_profit" };
  }

  const cappedProfit = Math.min(profit, CFG.maxEligibleProfitPerEvent);

  // IDEMPOTENCY: check if this transaction was already processed
  const existingEvent = queryOne(
    db,
    "SELECT id FROM affiliate_profit_events WHERE transaction_id = ?",
    [sourceTransactionId]
  );
  if (existingEvent) {
    return { ok: true, commissions: [], totalDistributed: 0, skipped: "already_processed" };
  }

  // Ensure source player exists
  ensurePlayer(db, sourcePlayerName);

  // Get ancestor chain
  const ancestors = getAncestors(db, sourcePlayerName);
  if (ancestors.length === 0) {
    return { ok: true, commissions: [], totalDistributed: 0, skipped: "no_ancestors" };
  }

  const commissions = [];
  let totalDistributed = 0;

  for (const ancestor of ancestors) {
    if (ancestor.level > CFG.maxDepth) break;

    const rate = CFG.getRate(ancestor.level);
    const commissionAmount = roundUsd(cappedProfit * rate);

    if (commissionAmount <= 0) continue;

    // Check account status
    const account = queryOne(db, "SELECT status FROM affiliate_players WHERE player_name = ?", [ancestor.player_name]);
    if (account && account.status !== CFG.ACCOUNT_STATUS.ACTIVE) {
      // Skip inactive accounts but still record for audit
      insertCommission(db, {
        beneficiaryUserId: ancestor.player_name,
        sourceUserId: sourcePlayerName,
        sourceProfitTransactionId: sourceTransactionId,
        affiliateLevel: ancestor.level,
        commissionRate: rate,
        eligibleProfit: cappedProfit,
        commissionAmount,
        status: CFG.STATUS.CANCELLED,
        description: `Account ${account.status}`,
      });
      continue;
    }

    // IDEMPOTENCY CHECK: unique constraint on (sourceTxId, beneficiary, level)
    const existing = queryOne(
      db,
      "SELECT id FROM affiliate_commission_transactions WHERE source_profit_tx_id = ? AND beneficiary_user_id = ? AND affiliate_level = ?",
      [sourceTransactionId, ancestor.player_name, ancestor.level]
    );

    if (existing) {
      // Already processed — skip (no duplicate)
      continue;
    }

    // Insert commission
    const entry = insertCommission(db, {
      beneficiaryUserId: ancestor.player_name,
      sourceUserId: sourcePlayerName,
      sourceProfitTransactionId: sourceTransactionId,
      affiliateLevel: ancestor.level,
      commissionRate: rate,
      eligibleProfit: cappedProfit,
      commissionAmount,
      status: CFG.STATUS.PENDING,
      description: profitDescription,
    });

    commissions.push(entry);
    totalDistributed += commissionAmount;
  }

  // Record the profit event for audit
  db.run(
    `INSERT INTO affiliate_profit_events
     (source_player, transaction_id, eligible_profit, description, created_at)
     VALUES (?, ?, ?, ?, datetime('now'))`,
    [sourcePlayerName, sourceTransactionId, cappedProfit, profitDescription]
  );

  totalDistributed = roundUsd(totalDistributed);

  return { ok: true, commissions, totalDistributed };
}

function insertCommission(db, {
  beneficiaryUserId, sourceUserId, sourceProfitTransactionId,
  affiliateLevel, commissionRate, eligibleProfit, commissionAmount,
  status, description,
}) {
  const id = crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}-${crypto.randomBytes(4).toString("hex")}`;

  db.run(
    `INSERT INTO affiliate_commission_transactions
     (id, beneficiary_user_id, source_user_id, source_profit_tx_id, affiliate_level,
      commission_rate, eligible_profit, commission_amount, currency, status,
      description, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'USD', ?, ?, datetime('now'))`,
    [id, beneficiaryUserId, sourceUserId, sourceProfitTransactionId,
     affiliateLevel, commissionRate, eligibleProfit, commissionAmount, status, description || ""]
  );

  return {
    id, beneficiaryUserId, sourceUserId, sourceProfitTransactionId,
    affiliateLevel, commissionRate, eligibleProfit, commissionAmount,
    currency: "USD", status,
  };
}

/* ═══════════════════════════════════════════
   REVERSAL
   ═══════════════════════════════════════════ */

/**
 * Reverse all commissions for a given profit transaction.
 * Called when a realized profit is reversed/cancelled.
 */
export function reverseProfitCommissions(db, sourceTransactionId) {
  if (!sourceTransactionId) return { ok: false, error: "missing_transaction_id" };

  const pending = queryAll(
    db,
    "SELECT * FROM affiliate_commission_transactions WHERE source_profit_tx_id = ? AND status IN ('pending', 'available')",
    [sourceTransactionId]
  );

  let reversed = 0;
  for (const tx of pending) {
    db.run(
      `UPDATE affiliate_commission_transactions
       SET status = 'reversed', settled_at = datetime('now')
       WHERE id = ?`,
      [tx.id]
    );
    reversed++;
  }

  return { ok: true, reversedCount: reversed };
}

/* ═══════════════════════════════════════════
   SETTLE PENDING → AVAILABLE
   ═══════════════════════════════════════════ */

export function settleCommissions(db, olderThanMinutes = 60) {
  const cutoff = new Date(Date.now() - olderThanMinutes * 60 * 1000).toISOString();

  db.run(
    `UPDATE affiliate_commission_transactions
     SET status = 'available', settled_at = datetime('now')
     WHERE status = 'pending' AND created_at < ?`,
    [cutoff]
  );
}

/* ═══════════════════════════════════════════
   QUERIES (Dashboard / Admin)
   ═══════════════════════════════════════════ */

export function getDashboard(db, playerName) {
  // Auto-register player on first access
  const player = ensurePlayer(db, playerName);

  const directReferrals = queryOne(
    db, "SELECT COUNT(*) as count FROM affiliate_players WHERE referred_by = ?", [playerName]
  );

  // Total network count (recursive - we walk all descendants)
  const networkCount = countNetwork(db, playerName);

  const pendingTotal = queryOne(
    db,
    "SELECT COALESCE(SUM(commission_amount), 0) as total FROM affiliate_commission_transactions WHERE beneficiary_user_id = ? AND status = 'pending'",
    [playerName]
  );

  const availableTotal = queryOne(
    db,
    "SELECT COALESCE(SUM(commission_amount), 0) as total FROM affiliate_commission_transactions WHERE beneficiary_user_id = ? AND status = 'available'",
    [playerName]
  );

  const earnedTotal = queryOne(
    db,
    "SELECT COALESCE(SUM(commission_amount), 0) as total FROM affiliate_commission_transactions WHERE beneficiary_user_id = ? AND status NOT IN ('cancelled', 'reversed')",
    [playerName]
  );

  // Level breakdown
  const levelStats = queryAll(
    db,
    `SELECT
       act.affiliate_level,
       COUNT(DISTINCT act.source_user_id) as user_count,
       COALESCE(SUM(act.eligible_profit), 0) as total_profit,
       COALESCE(SUM(act.commission_amount), 0) as total_commission
     FROM affiliate_commission_transactions act
     WHERE act.beneficiary_user_id = ? AND act.status NOT IN ('cancelled', 'reversed')
     GROUP BY act.affiliate_level
     ORDER BY act.affiliate_level`,
    [playerName]
  );

  // Recent commissions
  const recentCommissions = queryAll(
    db,
    `SELECT act.*, ap.affiliate_code as source_code
     FROM affiliate_commission_transactions act
     LEFT JOIN affiliate_players ap ON act.source_user_id = ap.player_name
     WHERE act.beneficiary_user_id = ?
     ORDER BY act.created_at DESC LIMIT 50`,
    [playerName]
  );

  // Direct referrals list (limited for privacy)
  const referrals = queryAll(
    db,
    `SELECT player_name, affiliate_code, status, created_at
     FROM affiliate_players WHERE referred_by = ?
     ORDER BY created_at DESC LIMIT 50`,
    [playerName]
  );

  return {
    player: {
      name: player.player_name,
      code: player.affiliate_code,
      status: player.status,
      referredBy: player.referred_by,
      createdAt: player.created_at,
    },
    directReferrals: directReferrals?.count || 0,
    networkCount,
    pendingCommissions: pendingTotal?.total || 0,
    availableCommissions: availableTotal?.total || 0,
    totalEarned: earnedTotal?.total || 0,
    levelStats,
    recentCommissions,
    referrals,
  };
}

function countNetwork(db, playerName) {
  let count = 0;
  const children = queryAll(db, "SELECT player_name FROM affiliate_players WHERE referred_by = ?", [playerName]);
  for (const child of children) {
    count++;
    count += countNetwork(db, child.player_name);
  }
  return count;
}

/**
 * Get the referral tree (lazy - only direct children by default).
 */
export function getReferralTree(db, playerName, depth = 1) {
  const children = queryAll(
    db,
    "SELECT player_name, affiliate_code, status, created_at FROM affiliate_players WHERE referred_by = ? ORDER BY created_at",
    [playerName]
  );

  if (depth <= 0) return children;

  return children.map((child) => ({
    ...child,
    children: getReferralTree(db, child.player_name, depth - 1),
  }));
}

/* ═══════════════════════════════════════════
   ADMIN QUERIES
   ═══════════════════════════════════════════ */

export function adminGetAllAffiliates(db, limit = 100, offset = 0) {
  return queryAll(
    db,
    `SELECT ap.*,
       (SELECT COUNT(*) FROM affiliate_players sub WHERE sub.referred_by = ap.player_name) as direct_count,
       (SELECT COALESCE(SUM(act2.commission_amount), 0) FROM affiliate_commission_transactions act2
        WHERE act2.beneficiary_user_id = ap.player_name AND act2.status NOT IN ('cancelled','reversed')) as total_earned
     FROM affiliate_players ap
     ORDER BY ap.created_at DESC
     LIMIT ? OFFSET ?`,
    [limit, offset]
  );
}

export function adminGetAllCommissions(db, limit = 100, offset = 0) {
  return queryAll(
    db,
    `SELECT act.*, ap2.affiliate_code as beneficiary_code, ap3.affiliate_code as source_code
     FROM affiliate_commission_transactions act
     LEFT JOIN affiliate_players ap2 ON act.beneficiary_user_id = ap2.player_name
     LEFT JOIN affiliate_players ap3 ON act.source_user_id = ap3.player_name
     ORDER BY act.created_at DESC
     LIMIT ? OFFSET ?`,
    [limit, offset]
  );
}

export function adminGetAuditLog(db, limit = 100) {
  return queryAll(
    db,
    "SELECT * FROM affiliate_audit_log ORDER BY created_at DESC LIMIT ?",
    [limit]
  );
}

export function addAuditLog(db, event, userName, details = "") {
  db.run(
    `INSERT INTO affiliate_audit_log (event, user_name, details, created_at) VALUES (?, ?, ?, datetime('now'))`,
    [event, userName, typeof details === "string" ? details : JSON.stringify(details)]
  );
}
