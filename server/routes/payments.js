import { Router } from "express";
import { getDbSync, flushDb } from "../db.js";
import { createPayment, verifyIpnSignature, isSandbox, getEnabledCurrencies } from "../services/nowpayments.js";
import crypto from "crypto";

const router = Router();
const DB_PATH = () => process.env.DB_PATH || "./data/harvest-valley.db";

function getOne(sql, params = []) {
  const db = getDbSync();
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

function getAll(sql, params = []) {
  const db = getDbSync();
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

function run(sql, params = []) {
  const db = getDbSync();
  db.run(sql, params.map((p) => (p === undefined ? null : p)));
  flushDb(DB_PATH());
}

function generateOrderId() {
  const ts = Date.now().toString(36).toUpperCase();
  const rand = crypto.randomBytes(4).toString("hex").toUpperCase();
  return `HV-DIAMONDS-${ts}-${rand}`;
}

/**
 * GET /api/payments/currencies
 */
router.get("/currencies", async (req, res) => {
  const enabled = await getEnabledCurrencies();
  if (enabled.length > 0) {
    // Return only uppercase enabled currencies
    res.json({ currencies: enabled.map((c) => c.toUpperCase()) });
  } else {
    // Fallback if API fails
    res.json({ currencies: ["BTC", "ETH", "USDC", "LTC", "BNB", "SOL", "DOGE", "XRP"] });
  }
});

/**
 * POST /api/payments/crypto/create
 * Body: { userId, packageId, payCurrency }
 */
router.post("/crypto/create", (req, res) => {
  const { userId = "guest", packageId, payCurrency = "btc" } = req.body || {};

  if (!packageId) {
    return res.status(400).json({ error: "packageId is required" });
  }

  const pkg = getOne("SELECT * FROM diamond_packages WHERE id = ? AND active = 1", [packageId]);
  if (!pkg) {
    return res.status(400).json({ error: "Invalid package" });
  }

  const orderId = generateOrderId();

  run(
    `INSERT INTO payments (id, user_id, package_id, provider, price_usd, pay_currency, status, created_at, updated_at)
     VALUES (?, ?, ?, 'nowpayments', ?, ?, 'created', datetime('now'), datetime('now'))`,
    [orderId, userId, pkg.id, pkg.price_usd, payCurrency.toLowerCase()]
  );

  createPayment({
    priceAmount: pkg.price_usd,
    priceCurrency: "usd",
    payCurrency: payCurrency.toLowerCase(),
    orderId,
    callbackUrl: `${req.protocol}://${req.get("host")}/api/payments/nowpayments/ipn`,
    successUrl: `${process.env.FRONTEND_URL || "http://localhost:5174"}?payment=success`,
    cancelUrl: `${process.env.FRONTEND_URL || "http://localhost:5174"}?payment=cancelled`,
  }).then((invoice) => {
    const providerPaymentId = invoice.payment_id || invoice.id || null;
    // NOWPayments invoice response may include invoice_url or id for constructing the embed URL
    const invoiceId = invoice.id || null;
    const invoiceUrl = invoice.invoice_url || (invoiceId
      ? `https://nowpayments.io/payment/?iid=${invoiceId}&source=button`
      : null);

    run(
      `UPDATE payments SET provider_payment_id = ?,
       status = 'waiting', updated_at = datetime('now') WHERE id = ?`,
      [providerPaymentId, orderId]
    );

    run(
      `INSERT INTO payment_events (payment_id, provider_status, payload) VALUES (?, 'created', ?)`,
      [orderId, JSON.stringify(invoice)]
    );

    run(
      `INSERT OR IGNORE INTO player_diamonds (user_id, balance, updated_at) VALUES (?, 0, datetime('now'))`,
      [userId]
    );

    const payment = getOne("SELECT * FROM payments WHERE id = ?", [orderId]);

    res.json({
      paymentId: orderId,
      invoiceId: invoiceId,
      paymentUrl: invoiceUrl,
      providerPaymentId: payment?.provider_payment_id,
      status: payment?.status || "waiting",
      priceUsd: payment?.price_usd || pkg.price_usd,
      diamonds: pkg.diamonds,
      payCurrency: payCurrency.toLowerCase(),
      createdAt: payment?.created_at,
      sandbox: isSandbox(),
    });
  }).catch((err) => {
    console.error("[API] create payment error:", err.message, err.stack);
    run(`UPDATE payments SET status = 'error', updated_at = datetime('now') WHERE id = ?`, [orderId]);
    res.status(500).json({ error: "Failed to create payment" });
  });
});

/**
 * GET /api/payments/crypto/:paymentId
 */
router.get("/crypto/:paymentId", (req, res) => {
  const payment = getOne("SELECT * FROM payments WHERE id = ?", [req.params.paymentId]);
  if (!payment) {
    return res.status(404).json({ error: "Payment not found" });
  }
  const pkg = getOne("SELECT * FROM diamond_packages WHERE id = ?", [payment.package_id]);

  res.json({
    paymentId: payment.id,
    providerPaymentId: payment.provider_payment_id,
    packageId: payment.package_id,
    priceUsd: payment.price_usd,
    payAddress: payment.pay_address,
    payAmount: payment.pay_amount,
    payCurrency: payment.pay_currency,
    payNetwork: payment.pay_network,
    status: payment.status,
    diamonds: pkg ? pkg.diamonds : 0,
    createdAt: payment.created_at,
    completedAt: payment.completed_at,
    sandbox: isSandbox(),
  });
});

/**
 * POST /api/payments/nowpayments/ipn
 */
router.post("/nowpayments/ipn", (req, res) => {
  const signature = req.headers["x-nowpayments-sig"];
  if (signature && !verifyIpnSignature(req.body, signature)) {
    console.warn("[IPN] Invalid signature");
    return res.status(401).json({ error: "Invalid signature" });
  }

  const { payment_id, order_id, pay_currency, pay_amount, payment_status } = req.body;

  console.log("[IPN] Received:", JSON.stringify(req.body, null, 2));

  if (!order_id) {
    return res.status(400).json({ error: "order_id required" });
  }

  const payment = getOne("SELECT * FROM payments WHERE id = ?", [order_id]);
  if (!payment) {
    console.warn("[IPN] Payment not found:", order_id);
    return res.status(404).json({ error: "Payment not found" });
  }

  run(
    `INSERT INTO payment_events (payment_id, provider_status, payload) VALUES (?, ?, ?)`,
    [order_id, payment_status, JSON.stringify(req.body)]
  );

  const STATUS_MAP = {
    sending: "confirming", partially_paid: "partially_paid", confirmed: "confirmed",
    completed: "finished", failed: "failed", refunded: "refunded",
    expired: "expired", pending: "waiting",
  };
  const newStatus = STATUS_MAP[payment_status] || payment_status;

  run(
    `UPDATE payments SET provider_payment_id = COALESCE(?, provider_payment_id),
     pay_currency = COALESCE(?, pay_currency), pay_amount = COALESCE(?, pay_amount),
     status = ?, updated_at = datetime('now') WHERE id = ?`,
    [payment_id, pay_currency, pay_amount, newStatus, order_id]
  );

  if (newStatus === "finished" && payment.status !== "finished") {
    const pkg = getOne("SELECT * FROM diamond_packages WHERE id = ?", [payment.package_id]);
    if (!pkg) return res.status(500).json({ error: "Package not found" });

    run(`UPDATE player_diamonds SET balance = balance + ?, updated_at = datetime('now') WHERE user_id = ?`,
      [pkg.diamonds, payment.user_id]);
    run(`UPDATE payments SET status = 'finished', completed_at = datetime('now'), updated_at = datetime('now') WHERE id = ?`,
      [order_id]);

    console.log(`[IPN] Credited ${pkg.diamonds} diamonds to user ${payment.user_id} for order ${order_id}`);
  }

  res.json({ ok: true });
});

/**
 * GET /api/payments/history
 */
router.get("/history", (req, res) => {
  const userId = req.query.userId || "guest";
  const payments = getAll(
    `SELECT p.*, dp.name as package_name, dp.diamonds
     FROM payments p LEFT JOIN diamond_packages dp ON p.package_id = dp.id
     WHERE p.user_id = ? ORDER BY p.created_at DESC LIMIT 50`,
    [userId]
  );
  res.json({
    history: payments.map((p) => ({
      paymentId: p.id, packageId: p.package_id, packageName: p.package_name,
      diamonds: p.diamonds, priceUsd: p.price_usd, payCurrency: p.pay_currency,
      status: p.status, createdAt: p.created_at, completedAt: p.completed_at,
    })),
  });
});

/**
 * GET /api/payments/balance
 */
router.get("/balance", (req, res) => {
  const userId = req.query.userId || "guest";
  let row = getOne("SELECT * FROM player_diamonds WHERE user_id = ?", [userId]);
  if (!row) {
    run(`INSERT INTO player_diamonds (user_id, balance) VALUES (?, 0)`, [userId]);
    row = { user_id: userId, balance: 0 };
  }
  res.json({ userId: row.user_id, balance: row.balance });
});

export default router;
