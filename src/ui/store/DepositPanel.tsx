import { useEffect, useState, useCallback } from "react";
import { useT } from "../../store/languageStore";

interface DepositConfig {
  walletAddress: string;
  network: string;
  telegram: string;
}

interface DepositRecord {
  id: number;
  amount: number;
  currency: string;
  network: string;
  txHash: string;
  confirmedAt: string;
}

export function DepositPanel({ onClose }: { onClose: () => void }) {
  const t = useT();
  const [config, setConfig] = useState<DepositConfig | null>(null);
  const [deposits, setDeposits] = useState<DepositRecord[]>([]);
  const [copied, setCopied] = useState<string | null>(null);

  const playerName = (() => {
    try {
      const raw = localStorage.getItem("granja_session");
      return raw ? JSON.parse(raw).name : null;
    } catch {
      return null;
    }
  })();

  const loadConfig = useCallback(async () => {
    try {
      const res = await fetch("/api/deposit/config");
      if (res.ok) setConfig(await res.json());
    } catch { /* ignore */ }
  }, []);

  const loadDeposits = useCallback(async () => {
    if (!playerName) return;
    try {
      const res = await fetch(`/api/deposits/player/${encodeURIComponent(playerName)}`);
      if (res.ok) {
        const data = await res.json();
        setDeposits(data.deposits || []);
      }
    } catch { /* ignore */ }
  }, [playerName]);

  useEffect(() => {
    loadConfig();
    loadDeposits();
  }, [loadConfig, loadDeposits]);

  const copyText = (text: string, label: string) => {
    navigator.clipboard.writeText(text).then(() => {
      setCopied(label);
      window.setTimeout(() => setCopied(null), 2000);
    });
  };

  const openTelegram = () => {
    if (config?.telegram) {
      const username = config.telegram.replace("@", "");
      window.open(`https://t.me/${username}`, "_blank", "noopener,noreferrer");
    }
  };

  return (
    <div className="deposit-backdrop" onClick={onClose}>
      <div className="deposit-modal" onClick={(e) => e.stopPropagation()}>
        <button className="deposit-close" onClick={onClose}>✕</button>

        <div className="deposit-header">
          <div className="deposit-header-icon">💰</div>
          <h2>{t("deposit.title")}</h2>
          <p className="deposit-subtitle">{t("deposit.subtitle")}</p>
        </div>

        <div className="deposit-info">
          <div className="deposit-field">
            <label>{t("deposit.network")}</label>
            <div className="deposit-value">{config?.network || "..."}</div>
          </div>

          <div className="deposit-field">
            <label>{t("deposit.wallet")}</label>
            <div className="deposit-value-row">
              <span className="deposit-address">{config?.walletAddress || "..."}</span>
              {config?.walletAddress && (
                <button className="deposit-copy" onClick={() => copyText(config.walletAddress, "wallet")}>
                  {copied === "wallet" ? "✓" : "📋"}
                </button>
              )}
            </div>
          </div>

          <div className="deposit-field">
            <label>{t("deposit.telegram_contact")}</label>
            <div className="deposit-value-row">
              <span className="deposit-address">{config?.telegram || "..."}</span>
              {config?.telegram && (
                <button className="deposit-copy" onClick={() => copyText(config.telegram, "tg")}>
                  {copied === "tg" ? "✓" : "📋"}
                </button>
              )}
            </div>
          </div>
        </div>

        {config?.telegram && (
          <button className="deposit-telegram-btn" onClick={openTelegram}>
            📱 {t("deposit.contact_telegram")}
          </button>
        )}

        <div className="deposit-instructions">
          <p>{t("deposit.instructions")}</p>
          <ul>
            <li>{t("deposit.instr_user")}</li>
            <li>{t("deposit.instr_amount")}</li>
            <li>{t("deposit.instr_network")}</li>
            <li>{t("deposit.instr_tx")}</li>
          </ul>
          <p className="deposit-note">{t("deposit.note")}</p>
        </div>

        {deposits.length > 0 && (
          <div className="deposit-history">
            <h3>{t("deposit.history")}</h3>
            <div className="deposit-list">
              {deposits.map((d) => (
                <div key={d.id} className="deposit-item">
                  <div className="deposit-item-main">
                    <span className="deposit-item-amount">${d.amount.toFixed(2)}</span>
                    <span className="deposit-item-currency">{d.currency}</span>
                  </div>
                  <div className="deposit-item-meta">
                    <span>{d.network}</span>
                    <span>{d.confirmedAt}</span>
                  </div>
                  <div className="deposit-item-tx" title={d.txHash}>
                    TX: {d.txHash.slice(0, 16)}...
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
