import { useState } from "react";
import { useUiStore } from "../../store/uiStore";
import { useEconomyStore } from "../../store/economyStore";
import type { ShopResult } from "../../store/shopStore";
import { fmtMoney, useAnimatedNumber, type NotifyFn } from "./StoreUI";
import { CropCards } from "./CropCards";
import { AnimalCards } from "./AnimalCards";
import { ReproCards } from "./ReproCards";
import { ProcessCards } from "./ProcessCards";
import { UpgradeCards } from "./UpgradeCards";
import { OfferCards } from "./OfferCards";

type StoreCategory = "crops" | "animals" | "repro" | "process" | "upgrades" | "offers";

const CATEGORIES: { id: StoreCategory; label: string; icon: string }[] = [
  { id: "crops", label: "Cultivos", icon: "🌱" },
  { id: "animals", label: "Animales", icon: "🐔" },
  { id: "repro", label: "Reproducción", icon: "🥚" },
  { id: "process", label: "Procesamiento", icon: "🏭" },
  { id: "upgrades", label: "Mejoras", icon: "🏗️" },
  { id: "offers", label: "Ofertas", icon: "🎁" },
];

interface Toast {
  id: number;
  ok: boolean;
  message: string;
  detail?: string;
}

interface Fx {
  id: number;
  icon: string;
  label: string;
}

let toastSeq = 1;

/** Overlay de la tienda: solo se renderiza cuando está abierta. */
export function Store() {
  const storeOpen = useUiStore((s) => s.storeOpen);
  const closeStore = useUiStore((s) => s.closeStore);
  const gold = useEconomyStore((s) => s.gold);
  const displayGold = useAnimatedNumber(gold);
  const [cat, setCat] = useState<StoreCategory>("crops");
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [fx, setFx] = useState<Fx[]>([]);

  if (!storeOpen) return null;

  const notify: NotifyFn = (r: ShopResult, icon: string) => {
    const id = toastSeq++;
    setToasts((t) => [...t, { id, ok: r.ok, message: r.message, detail: r.detail }]);
    if (r.ok) {
      setFx((f) => [...f, { id, icon, label: r.message.replace(/^✓\s*/, "").replace(/ COMPRAD.*$/, "") }]);
      window.setTimeout(() => setFx((f) => f.filter((x) => x.id !== id)), 1600);
    }
    window.setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 3600);
  };

  return (
    <div className="store-overlay">
      <div className="store-panel">
        <header className="store-topbar">
          <span className="store-title">🛒 TIENDA</span>
          <span className="store-balance">
            💰 SALDO: <b>{fmtMoney(displayGold)}</b>
          </span>
          <button className="sidepanel-close" onClick={closeStore} aria-label="Cerrar tienda">
            ✕
          </button>
        </header>
        <nav className="store-tabs">
          {CATEGORIES.map((c) => (
            <button
              key={c.id}
              className={`store-tab ${cat === c.id ? "active" : ""}`}
              onClick={() => setCat(c.id)}
            >
              <span className="store-tab-icon">{c.icon}</span>
              <span className="store-tab-label">{c.label}</span>
            </button>
          ))}
        </nav>
        <div className="store-body">
          {cat === "crops" && <CropCards notify={notify} />}
          {cat === "animals" && <AnimalCards notify={notify} />}
          {cat === "repro" && <ReproCards />}
          {cat === "process" && <ProcessCards />}
          {cat === "upgrades" && <UpgradeCards notify={notify} />}
          {cat === "offers" && <OfferCards notify={notify} />}
        </div>
      </div>
      <div className="store-fx" aria-hidden="true">
        {fx.map((f) => (
          <div key={f.id} className="buyfx">
            <span className="buyfx-icon">{f.icon}</span>
            <span className="buyfx-label">{f.label}</span>
          </div>
        ))}
      </div>
      <div className="store-toasts">
        {toasts.map((t) => (
          <div key={t.id} className={`toast ${t.ok ? "ok" : "err"}`}>
            <div className="toast-msg">{t.message}</div>
            {t.detail && <div className="toast-detail">{t.detail}</div>}
          </div>
        ))}
      </div>
    </div>
  );
}
