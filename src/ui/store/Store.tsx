import { useEffect, useMemo, useState } from "react";
import { useUiStore } from "../../store/uiStore";
import { useEconomyStore } from "../../store/economyStore";
import { useShopStore, validateAnimalCapacity } from "../../store/shopStore";
import type { ShopResult } from "../../store/shopStore";
import { useT } from "../../store/languageStore";
import { OFFER_LIST, offerNormalPrice, offerSalePrice, offerSavings, effectiveDiscount } from "../../config/offers";
import { getCropEconomy, getAnimalEconomy } from "../../config/economy";
import type { AnimalKind } from "../../types";
import { fmtMoney, useAnimatedNumber, type NotifyFn } from "./StoreUI";
import { CropCards } from "./CropCards";
import { AnimalCards } from "./AnimalCards";
import { ProductCards } from "./ProductCards";
import { ProcessCards } from "./ProcessCards";
import { UpgradeCards } from "./UpgradeCards";
import { ExpansionCards } from "./ExpansionCards";
import { FeedCards } from "./FeedCards";
import { OfferCards } from "./OfferCards";
import { Farmer } from "./Farmer";

type StoreCategory = "crops" | "animals" | "products" | "process" | "infra" | "expansions" | "feed" | "offers";

const CATEGORY_ORDER: StoreCategory[] = ["crops", "animals", "products", "process", "infra", "expansions", "feed"];

const CATEGORY_ICON: Record<StoreCategory, string> = {
  crops: "🌱",
  animals: "🐔",
  products: "🥛",
  process: "⚙️",
  infra: "🏠",
  expansions: "🗺️",
  feed: "🌾",
  offers: "🎁",
};

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
  const t = useT();
  const storeOpen = useUiStore((s) => s.storeOpen);
  const closeStore = useUiStore((s) => s.closeStore);
  const gold = useEconomyStore((s) => s.gold);
  const diamonds = useEconomyStore((s) => s.diamonds);
  const displayGold = useAnimatedNumber(gold);
  const [cat, setCat] = useState<StoreCategory>("crops");
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [fx, setFx] = useState<Fx[]>([]);

  useEffect(() => {
    document.body.classList.toggle("store-open", storeOpen);
    return () => document.body.classList.remove("store-open");
  }, [storeOpen]);

  const featured = useMemo(() => {
    let best: (typeof OFFER_LIST)[number] | null = null;
    let bestSave = -1;
    for (const o of OFFER_LIST) {
      const s = offerSavings(o);
      if (s > bestSave) {
        bestSave = s;
        best = o;
      }
    }
    return best;
  }, []);

  const featuredBlocked = featured ? !!validateAnimalCapacity(featured.items) : false;

  if (!storeOpen) return null;

  const notify: NotifyFn = (r: ShopResult, icon: string) => {
    const id = toastSeq++;
    setToasts((prev) => [...prev, { id, ok: r.ok, message: r.message, detail: r.detail }]);
    if (r.ok) {
      setFx((prev) => [...prev, { id, icon, label: r.fxLabel ?? r.message }]);
      window.setTimeout(() => setFx((prev) => prev.filter((x) => x.id !== id)), 1600);
    }
    window.setTimeout(() => setToasts((prev) => prev.filter((x) => x.id !== id)), 3600);
  };

  const offerItemLabel = (item: { type: "seed" | "animal"; cropId?: string; kind?: AnimalKind; qty: number }): string => {
    if (item.type === "seed") {
      const def = getCropEconomy(item.cropId ?? "");
      return `${item.qty}× ${def ? t(`crop.${item.cropId}`) : item.cropId}`;
    }
    const def = getAnimalEconomy(item.kind ?? "");
    return `${item.qty}× ${def ? t(`animal.${item.kind}`) : item.kind}`;
  };

  const diamondHint = () => {
    notify({ ok: false, message: t("store.coming_soon"), detail: t("store.coming_soon_detail") }, "💎");
  };

  return (
    <div className="store-overlay">
      <div className="store-frame">
        <header className="store-top">
          <div className="store-sign">
            <div className="sign-ropes">
              <span className="sign-rope" />
              <span className="sign-rope" />
            </div>
            <div className="sign-board">
              <div className="sign-brand">HARVEST VALLEY</div>
              <div className="sign-title">
                {t("store.tienda")}
                <br />
                {t("store.de_la_granja")}
              </div>
            </div>
            <div className="sign-leaves">
              <span>🌿</span>
              <span>🌿</span>
              <span>🌻</span>
            </div>
          </div>

          <div className="store-resources">
            <div className="res-panel res-coins">
              <span className="res-icon">🪙</span>
              <div className="res-meta">
                <span className="res-label">{t("store.monedas")}</span>
                <span className="res-value">{fmtMoney(displayGold)}</span>
              </div>
              <button className="res-add" aria-label={t("store.buy_coins")} title={t("store.buy_coins")} onClick={diamondHint}>
                +
              </button>
            </div>
            <div className="res-panel res-diamonds">
              <span className="res-icon">💎</span>
              <div className="res-meta">
                <span className="res-label">{t("store.diamantes")}</span>
                <span className="res-value">{diamonds}</span>
              </div>
              <button className="res-add" aria-label={t("store.buy_diamonds")} title={t("store.buy_diamonds")} onClick={diamondHint}>
                +
              </button>
            </div>
            <button className="store-close" aria-label={t("store.close_store")} onClick={closeStore}>
              ✕
            </button>
          </div>
        </header>

        <nav className="store-tabs" aria-label={t("store.tabs_aria")}>
          {CATEGORY_ORDER.map((id) => (
            <button
              key={id}
              className={`store-tab ${cat === id ? "active" : ""}`}
              onClick={() => setCat(id)}
            >
              <span className="store-tab-icon">{CATEGORY_ICON[id]}</span>
              <span className="store-tab-label">{t(`store.category.${id}`)}</span>
            </button>
          ))}
        </nav>

        <div className="store-mid">
          <aside className="store-left">
            <Farmer />
            <div className="info-panel">
              <div className="info-panel-head">{t("store.info_title")}</div>
              <p>{t("store.info_1")}</p>
              <p>{t("store.info_2")}</p>
              <p>
                <b>{t("store.info_3")}</b>
              </p>
            </div>
            <div className="decor-crate" aria-hidden="true">
              <div className="crate-veggies">
                <span>🥕</span>
                <span>🌽</span>
                <span>🍅</span>
                <span>🥬</span>
              </div>
              <div className="crate-box" />
              <svg className="crate-can" viewBox="0 0 60 60">
                <path d="M10 22 h34 a6 6 0 0 1 6 6 v14 a8 8 0 0 1 -8 8 h-24 a8 8 0 0 1 -8 -8 z" fill="#9aa3ad" />
                <path d="M18 16 h18 v6 h-18 z" fill="#7c8690" />
                <path d="M50 24 l8 -4 v12 l-8 -4 z" fill="#7c8690" />
                <path d="M14 26 q4 -10 12 -10 q-2 6 -6 10 z" fill="#9aa3ad" />
              </svg>
            </div>
          </aside>

          <main className="store-main">
            <div className="panel-head">
              <span className="panel-head-icon">{CATEGORY_ICON[cat]}</span>
              <span className="panel-head-title">{t(`store.category.${cat}`).toUpperCase()}</span>
              <span className="panel-head-deco">❦</span>
            </div>
            <div className="panel-body">
              {cat === "crops" && <CropCards notify={notify} />}
              {cat === "animals" && <AnimalCards notify={notify} />}
              {cat === "products" && <ProductCards />}
              {cat === "process" && <ProcessCards />}
              {cat === "infra" && <UpgradeCards notify={notify} />}
              {cat === "expansions" && <ExpansionCards />}
              {cat === "feed" && <FeedCards />}
              {cat === "offers" && <OfferCards notify={notify} />}
            </div>
          </main>

          <aside className="store-right">
            {featured && (
              <div className="offer-special">
                <div className="ribbon">{t("store.special_ribbon")}</div>
                <div className="offer-special-head">
                  <span className="offer-special-icon">{featured.icon}</span>
                  <span className="offer-special-title">{t(`offer.${featured.id}.name`).toUpperCase()}</span>
                </div>
                <div className="offer-special-items">
                  {featured.items.map((item, i) => (
                    <div key={i} className="offer-item">
                      {offerItemLabel(item)}
                    </div>
                  ))}
                </div>
                <div className="offer-prices">
                  <span className="offer-normal">
                    <s>{fmtMoney(offerNormalPrice(featured))}</s>
                  </span>
                  <span className="offer-sale">{fmtMoney(offerSalePrice(featured))}</span>
                </div>
                <div className="offer-special-meta">
                  <span className="offer-discount">
                    -{Math.round(effectiveDiscount(featured) * 100)}%
                  </span>
                  <span className="offer-savings">{t("store.ahorras", { money: fmtMoney(offerSavings(featured)) })}</span>
                </div>
                <button
                  className="buybtn buybtn-offer"
                  disabled={
                    useEconomyStore.getState().gold < offerSalePrice(featured) || featuredBlocked
                  }
                  title={
                    featuredBlocked
                      ? t("store.combo_blocked_title")
                      : undefined
                  }
                  onClick={() => notify(useShopStore.getState().buyCombo(featured.id), featured.icon)}
                >
                  {t("store.comprar")}
                </button>
                {featuredBlocked && (
                  <div className="offer-special-warn">{t("store.combo_warn")}</div>
                )}
                <button className="textbtn" onClick={() => setCat("offers")}>
                  {t("store.view_all")}
                </button>
              </div>
            )}

            <div className="diamond-panel">
              <div className="diamond-panel-gems">💎💠💎</div>
              <div className="diamond-panel-title">{t("store.diamantes")}</div>
              <p>{t("store.diamond_panel_text")}</p>
              <button className="diamond-btn" onClick={() => setCat("offers")}>
                {t("store.ver_ofertas")}
              </button>
            </div>
          </aside>
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
