import { useEffect, useCallback, useState, useMemo } from "react";
import { DIAMOND_PACKAGES } from "../../config/economy";
import { useDiamondStore } from "../../store/diamondStore";
import { useEconomyStore } from "../../store/economyStore";
import { useT } from "../../store/languageStore";

const CRYPTO_OPTIONS = ["BTC", "ETH", "USDT", "USDC", "LTC", "BNB", "SOL"];

type View = "packages" | "select-crypto" | "waiting" | "success" | "failed";

export function DiamondPurchaseModal() {
  const t = useT();
  const isOpen = useDiamondStore((s) => s.purchaseModalOpen);
  const closeModal = useDiamondStore((s) => s.closePurchaseModal);
  const dismissPayment = useDiamondStore((s) => s.dismissPayment);
  const diamonds = useEconomyStore((s) => s.diamonds);
  const activePayment = useDiamondStore((s) => s.activePayment);
  const createPayment = useDiamondStore((s) => s.createPayment);

  const [view, setView] = useState<View>("packages");
  const [selectedPkgId, setSelectedPkgId] = useState<string | null>(null);
  const [selectedCurrency, setSelectedCurrency] = useState("BTC");
  const [error, setError] = useState<string | null>(null);

  const selectedPkg = useMemo(
    () => DIAMOND_PACKAGES.find((p) => p.id === selectedPkgId) ?? null,
    [selectedPkgId]
  );

  // Reset view when modal opens/closes
  useEffect(() => {
    if (!isOpen) {
      setView("packages");
      setSelectedPkgId(null);
      setError(null);
    }
  }, [isOpen]);

  // React to payment status changes
  useEffect(() => {
    if (!activePayment) return;
    if (activePayment.status === "finished") setView("success");
    else if (["failed", "expired", "cancelled"].includes(activePayment.status)) setView("failed");
  }, [activePayment?.status]);

  // Check URL params for payment result (from redirect)
  useEffect(() => {
    if (!isOpen) return;
    const params = new URLSearchParams(window.location.search);
    if (params.get("payment") === "success") {
      setView("success");
      window.history.replaceState({}, "", window.location.pathname);
    } else if (params.get("payment") === "cancelled") {
      setView("failed");
      window.history.replaceState({}, "", window.location.pathname);
    }
  }, [isOpen]);

  const handleClose = useCallback(() => {
    closeModal();
  }, [closeModal]);

  useEffect(() => {
    if (!isOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") handleClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [isOpen, handleClose]);

  const handleBuyClick = useCallback((pkgId: string) => {
    setSelectedPkgId(pkgId);
    setView("select-crypto");
    setError(null);
  }, []);

  const handleCurrencySelect = useCallback(async (currency: string) => {
    setSelectedCurrency(currency);
    setError(null);
    if (!selectedPkgId) return;

    setView("waiting");
    const order = await createPayment(selectedPkgId, currency);
    if (!order) {
      setError(t("diamond.error_create"));
      setView("select-crypto");
      return;
    }

    // Open NOWPayments hosted payment page in new tab
    if (order.paymentUrl) {
      window.open(order.paymentUrl, "_blank", "noopener,noreferrer");
    }
  }, [selectedPkgId, createPayment, t]);

  const handleBack = useCallback(() => {
    setError(null);
    if (view === "select-crypto") setView("packages");
    else if (view === "waiting") {
      dismissPayment();
      setView("select-crypto");
    } else if (view === "success" || view === "failed") {
      dismissPayment();
      setView("packages");
    }
  }, [view, dismissPayment]);

  if (!isOpen) return null;

  return (
    <div className="diamond-modal-backdrop" onClick={handleClose}>
      <div className="diamond-modal" onClick={(e) => e.stopPropagation()}>
        <button className="diamond-modal-close" onClick={handleClose} aria-label={t("diamond.close")}>
          ✕
        </button>

        <div className="diamond-modal-header">
          <div className="diamond-modal-gems">💎💎💎</div>
          <h2 className="diamond-modal-title">{t("diamond.title")}</h2>
          {view === "packages" && <p className="diamond-modal-sub">{t("diamond.subtitle")}</p>}
          {view === "packages" && (
            <div className="diamond-modal-balance">💎 {diamonds.toLocaleString()}</div>
          )}
          {view !== "packages" && (
            <button className="diamond-back-btn" onClick={handleBack}>
              ← {t("diamond.back")}
            </button>
          )}
        </div>

        {/* Package Selection */}
        {view === "packages" && (
          <>
            <div className="diamond-modal-grid">
              {DIAMOND_PACKAGES.map((pkg) => (
                <div key={pkg.id} className={`diamond-card ${pkg.badge ? "diamond-card--featured" : ""}`}>
                  {pkg.badge && <div className="diamond-card-badge">{pkg.badge}</div>}
                  <div className="diamond-card-gems">
                    <span className="diamond-card-icon">💎</span>
                    <span className="diamond-card-qty">{pkg.diamonds.toLocaleString()}</span>
                  </div>
                  <div className="diamond-card-name">{t(pkg.nameKey)}</div>
                  <div className="diamond-card-price">${pkg.price.toFixed(2)}</div>
                  <button className="diamond-card-buy" onClick={() => handleBuyClick(pkg.id)}>
                    {t("diamond.buy")}
                  </button>
                </div>
              ))}
            </div>
            <div className="diamond-modal-footer">{t("diamond.footer")}</div>
          </>
        )}

        {/* Crypto Currency Selection */}
        {view === "select-crypto" && selectedPkg && (
          <div className="diamond-crypto-select">
            <div className="diamond-crypto-selected">
              {t("diamond.pay_for")} 💎 {selectedPkg.diamonds.toLocaleString()} — ${selectedPkg.price.toFixed(2)}
            </div>
            <div className="diamond-crypto-label">{t("diamond.select_crypto")}</div>
            <div className="diamond-crypto-list">
              {CRYPTO_OPTIONS.map((cur) => (
                <button
                  key={cur}
                  className={`diamond-crypto-option ${selectedCurrency === cur ? "diamond-crypto-option--active" : ""}`}
                  onClick={() => handleCurrencySelect(cur)}
                >
                  {getCryptoIcon(cur)} {cur}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Waiting for Payment */}
        {view === "waiting" && activePayment && (
          <div className="diamond-waiting">
            {activePayment.sandbox && (
              <div className="diamond-sandbox-badge">🧪 {t("diamond.sandbox")}</div>
            )}

            <div className="diamond-payment-status">
              <StatusDot status={activePayment.status} />
              <span>{t(`diamond.status.${activePayment.status}`)}</span>
            </div>

            <div className="diamond-waiting-info">
              <p className="diamond-waiting-hint">{t("diamond.payment_window_opened")}</p>
              <p className="diamond-waiting-hint-sub">{t("diamond.payment_hint")}</p>
            </div>

            {activePayment.paymentUrl && (
              <div className="diamond-waiting-actions">
                <button
                  className="diamond-card-buy"
                  onClick={() => window.open(activePayment.paymentUrl, "_blank", "noopener,noreferrer")}
                >
                  {t("diamond.open_payment_page")}
                </button>
              </div>
            )}

            <div className="diamond-payment-actions">
              <button className="diamond-cancel-btn" onClick={handleBack}>
                {t("diamond.cancel_payment")}
              </button>
            </div>
          </div>
        )}

        {/* Success View */}
        {view === "success" && (
          <div className="diamond-result diamond-result--success">
            <div className="diamond-result-icon">✅</div>
            <h3>{t("diamond.payment_success")}</h3>
            <p>{t("diamond.payment_success_desc")}</p>
            <div className="diamond-result-diamonds">
              +💎 {activePayment?.diamonds?.toLocaleString() ?? "—"}
            </div>
            <button className="diamond-card-buy" onClick={handleClose}>
              {t("diamond.close")}
            </button>
          </div>
        )}

        {/* Failed View */}
        {view === "failed" && (
          <div className="diamond-result diamond-result--failed">
            <div className="diamond-result-icon">❌</div>
            <h3>{t("diamond.payment_failed")}</h3>
            <p>{t("diamond.payment_failed_desc")}</p>
            <button className="diamond-card-buy" onClick={handleBack}>
              {t("diamond.try_again")}
            </button>
          </div>
        )}

        {error && <div className="diamond-modal-toast">{error}</div>}
      </div>
    </div>
  );
}

function StatusDot({ status }: { status: string }) {
  const color =
    status === "finished" ? "#4caf50" :
    status === "waiting" || status === "confirming" ? "#ff9800" :
    status === "failed" || status === "expired" ? "#f44336" :
    "#9e9e9e";
  return <span className="diamond-status-dot" style={{ background: color }} />;
}

function getCryptoIcon(cur: string): string {
  const icons: Record<string, string> = {
    BTC: "₿", ETH: "Ξ", USDT: "₮", USDC: "$", LTC: "Ł", BNB: "◆", SOL: "◎", DOGE: "Ð", XRP: "✕", TRX: "△", MATIC: "⬡", DAI: "◈",
  };
  return icons[cur] || "●";
}
