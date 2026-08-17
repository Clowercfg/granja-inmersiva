import crypto from "crypto";

const SANDBOX_BASE = "https://api-sandbox.nowpayments.io";
const PRODUCTION_BASE = "https://api.nowpayments.io";

function getBaseUrl() {
  return process.env.NOWPAYMENTS_SANDBOX === "true" ? SANDBOX_BASE : PRODUCTION_BASE;
}

function getApiKey() {
  return process.env.NOWPAYMENTS_API_KEY;
}

function getIpnSecret() {
  return process.env.NOWPAYMENTS_IPN_SECRET;
}

function isSandbox() {
  return process.env.NOWPAYMENTS_SANDBOX === "true";
}

/**
 * GET /v1/currency — list available currencies
 */
export async function getAvailableCurrencies() {
  const res = await fetch(`${getBaseUrl()}/v1/currency`, {
    headers: { "x-api-key": getApiKey() },
  });
  if (!res.ok) throw new Error(`NOWPayments currencies error: ${res.status}`);
  const data = await res.json();
  return data.currencies || [];
}

/**
 * POST /v1/invoice — create a payment invoice
 * Returns NOWPayments invoice with hosted payment page URL
 */
export async function createPayment({ priceAmount, priceCurrency, payCurrency, orderId, callbackUrl, successUrl, cancelUrl }) {
  // Sandbox fallback: use mock invoice data
  // NOWPayments sandbox doesn't support /v1/invoice, so we mock it
  if (isSandbox() || !getApiKey()) {
    console.warn("[NOWPayments] Sandbox mode — using mock invoice for testing");
    const mockIid = `MOCK-IID-${Date.now().toString(36).toUpperCase()}`;
    const mockUrl = `https://nowpayments.io/payment/?iid=${mockIid}&source=button`;
    return {
      id: mockIid,
      invoice_url: mockUrl,
      payment_id: mockIid,
      status: "pending",
    };
  }

  const body = {
    price_amount: priceAmount,
    price_currency: priceCurrency.toLowerCase(),
    pay_currency: payCurrency.toLowerCase(),
    order_id: orderId,
    order_description: `Harvest Valley — ${orderId}`,
    ipn_callback_url: callbackUrl,
    success_url: successUrl,
    cancel_url: cancelUrl,
  };

  console.log("[NOWPayments] createInvoice:", JSON.stringify(body, null, 2));

  const res = await fetch(`${getBaseUrl()}/v1/invoice`, {
    method: "POST",
    headers: {
      "x-api-key": getApiKey(),
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const text = await res.text();
    console.error("[NOWPayments] createInvoice error:", res.status, text);
    throw new Error(`NOWPayments create invoice error: ${res.status}`);
  }

  const data = await res.json();
  console.log("[NOWPayments] createInvoice response:", JSON.stringify(data, null, 2));
  return data;
}

/**
 * POST /v1/ipn/get-merchant-amount — optional: verify amounts
 */

/**
 * Verify IPN signature from NOWPayments
 * https://documenter.getpostman.com/view/7966904/S1a67p3a#e062c4d4-2746-4440-9759-e7ab57ea2745
 */
export function verifyIpnSignature(body, signature) {
  const secret = getIpnSecret();
  if (!secret) {
    console.warn("[NOWPayments] No IPN secret configured — skipping verification");
    return true;
  }

  const sortedKeys = Object.keys(body).sort();
  const signString = sortedKeys.map((k) => `${k}=${JSON.stringify(body[k])}`).join("&");
  const hmac = crypto.createHmac("sha512", secret).update(signString).digest("hex");
  return hmac === signature;
}

/**
 * GET /v1/min-amount — get minimum payment amount for a currency
 */
export async function getMinAmount(payCurrency) {
  const res = await fetch(`${getBaseUrl()}/v1/min-amount?pay_currency=${payCurrency.toLowerCase()}`, {
    headers: { "x-api-key": getApiKey() },
  });
  if (!res.ok) return null;
  const data = await res.json();
  return data.min_amount ?? null;
}

export { isSandbox, getBaseUrl };
