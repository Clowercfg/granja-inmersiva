import { Router } from "express";
import { getDb, saveDb } from "../db.js";
import {
  ensurePlayer, registerReferral, processProfitEvent,
  reverseProfitCommissions, settleCommissions, getDashboard,
  getReferralTree, addAuditLog,
  adminGetAllAffiliates, adminGetAllCommissions, adminGetAuditLog,
} from "../services/affiliateEngine.js";
import { AFFILIATE_CONFIG as CFG } from "../config/affiliate.js";
import { optionalAuth, requireAuth } from "../middleware/auth.js";

const DB_PATH_DEFAULT = () => process.env.DB_PATH || "./data/harvest-valley.db";

export function createAffiliatesRouter(dbPath) {
  const router = Router();
  const getPath = () => dbPath || DB_PATH_DEFAULT();

  /* ─── Player: register / get code (uses session userId) ─── */

  router.get("/affiliate/code/me", optionalAuth, requireAuth, (req, res) => {
    const db = getDb();
    const player = ensurePlayer(db, req.userId);
    saveDb(getPath());
    res.json({
      playerName: player.player_name,
      affiliateCode: player.affiliate_code,
      status: player.status,
      referredBy: player.referred_by,
    });
  });

  /* ─── Player: register referral (uses session userId) ─── */

  router.post("/affiliate/register", optionalAuth, requireAuth, (req, res) => {
    const db = getDb();
    const { referralCode } = req.body || {};
    const result = registerReferral(db, req.userId, referralCode);

    if (result.ok) {
      addAuditLog(db, "referral_registered", req.userId, `Referred by ${result.referrer?.name}`);
      saveDb(getPath());
    }

    const status = result.ok ? 200 : 400;
    res.status(status).json(result);
  });

  /* ─── Player: dashboard (uses session userId) ─── */

  router.get("/affiliate/dashboard/me", optionalAuth, requireAuth, (req, res) => {
    const db = getDb();
    const dashboard = getDashboard(db, req.userId);
    res.json(dashboard);
  });

  /* ─── Player: referral tree (uses session userId) ─── */

  router.get("/affiliate/tree/me", optionalAuth, requireAuth, (req, res) => {
    const db = getDb();
    const depth = Math.min(parseInt(req.query.depth) || 1, 5);
    const tree = getReferralTree(db, req.userId, depth);
    res.json({ tree });
  });

  /* ─── Player: referral link info (uses session userId) ─── */

  router.get("/affiliate/link/me", optionalAuth, requireAuth, (req, res) => {
    const db = getDb();
    const player = ensurePlayer(db, req.userId);
    res.json({
      code: player.affiliate_code,
      link: `${process.env.FRONTEND_URL || "http://localhost:5174"}/?ref=${player.affiliate_code}`,
    });
  });

  /* ─── Frontend: report eligible profit (uses session userId) ─── */

  router.post("/affiliate/report-profit", optionalAuth, requireAuth, (req, res) => {
    const db = getDb();
    const { transactionId, eligibleProfit, description } = req.body || {};

    if (!transactionId || eligibleProfit === undefined) {
      return res.status(400).json({ error: "Missing required fields" });
    }

    const result = processProfitEvent(db, req.userId, transactionId, eligibleProfit, description);

    if (result.ok && result.commissions.length > 0) {
      addAuditLog(db, "profit_processed", req.userId, {
        transactionId,
        eligibleProfit,
        commissionsCreated: result.commissions.length,
        totalDistributed: result.totalDistributed,
      });
      saveDb(getPath());
    }

    res.json(result);
  });

  /* ─── Admin: reverse commissions ─── */

  router.post("/affiliate/admin/reverse", (req, res) => {
    const db = getDb();
    const { transactionId, adminName } = req.body || {};
    if (!transactionId) return res.status(400).json({ error: "transactionId required" });

    const result = reverseProfitCommissions(db, transactionId);
    if (result.ok) {
      addAuditLog(db, "commissions_reversed", adminName || "system", { transactionId, reversed: result.reversedCount });
      saveDb(getPath());
    }
    res.json(result);
  });

  /* ─── Admin: settle pending → available ─── */

  router.post("/affiliate/admin/settle", (req, res) => {
    const db = getDb();
    const { olderThanMinutes, adminName } = req.body || {};
    settleCommissions(db, olderThanMinutes || 60);
    addAuditLog(db, "commissions_settled", adminName || "system", { olderThanMinutes: olderThanMinutes || 60 });
    saveDb(getPath());
    res.json({ ok: true });
  });

  /* ─── Admin: list all affiliates ─── */

  router.get("/affiliate/admin/list", (req, res) => {
    const db = getDb();
    const limit = Math.min(parseInt(req.query.limit) || 50, 200);
    const offset = parseInt(req.query.offset) || 0;
    res.json({ affiliates: adminGetAllAffiliates(db, limit, offset) });
  });

  /* ─── Admin: list all commissions ─── */

  router.get("/affiliate/admin/commissions", (req, res) => {
    const db = getDb();
    const limit = Math.min(parseInt(req.query.limit) || 50, 200);
    const offset = parseInt(req.query.offset) || 0;
    res.json({ commissions: adminGetAllCommissions(db, limit, offset) });
  });

  /* ─── Admin: audit log ─── */

  router.get("/affiliate/admin/audit", (req, res) => {
    const db = getDb();
    const limit = Math.min(parseInt(req.query.limit) || 50, 200);
    res.json({ audit: adminGetAuditLog(db, limit) });
  });

  /* ─── Admin: get config ─── */

  router.get("/affiliate/admin/config", (req, res) => {
    res.json({ config: CFG });
  });

  return router;
}
