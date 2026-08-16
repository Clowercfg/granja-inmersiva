import {
  OFFER_LIST,
  offerNormalPrice,
  offerSalePrice,
  offerSavings,
  effectiveDiscount,
  type OfferDef,
} from "../../config/offers";
import { getCropEconomy, getAnimalEconomy } from "../../config/economy";
import { useEconomyStore } from "../../store/economyStore";
import { useShopStore } from "../../store/shopStore";
import { useT } from "../../store/languageStore";
import { StoreCard, fmtMoney, type NotifyFn } from "./StoreUI";

const CROP_ICON: Record<string, string> = { wheat: "🌾", corn: "🌽", carrot: "🥕", potato: "🥔" };

function itemLabel(
  item: OfferDef["items"][number],
  t: (key: string, params?: Record<string, string | number>) => string
): string {
  if (item.type === "seed") {
    const def = getCropEconomy(item.cropId);
    return `${item.qty}× ${CROP_ICON[item.cropId] ?? "🌱"} ${def ? t(`crop.${item.cropId}`) : item.cropId}`;
  }
  const def = getAnimalEconomy(item.kind);
  return `${item.qty}× ${def?.icon ?? "🐾"} ${def ? t(`animal.${item.kind}`) : item.kind}`;
}

export function OfferCards({ notify }: { notify: NotifyFn }) {
  const t = useT();
  return (
    <div className="store-grid">
      {OFFER_LIST.map((def) => (
        <OfferCard key={def.id} def={def} notify={notify} />
      ))}
    </div>
  );
}

function OfferCard({ def, notify }: { def: OfferDef; notify: NotifyFn }) {
  const t = useT();
  const gold = useEconomyStore((s) => s.gold);
  const normal = offerNormalPrice(def);
  const sale = offerSalePrice(def);
  const savings = offerSavings(def);
  const discount = effectiveDiscount(def) * 100;

  return (
    <StoreCard className="scard-offer">
      <div className="offer-badge">-{Math.round(discount)}%</div>
      <div className="scard-icon">{def.icon}</div>
      <div className="scard-title">{t(`offer.${def.id}.name`).toUpperCase()}</div>
      <div className="scard-detail">{t(`offer.${def.id}.desc`)}</div>
      <div className="offer-items">
        {def.items.map((item, i) => (
          <div key={i} className="offer-item">
            {itemLabel(item, t)}
          </div>
        ))}
      </div>
      <div className="offer-prices">
        <span className="offer-normal">
          <s>{fmtMoney(normal)}</s>
        </span>
        <span className="offer-sale">{fmtMoney(sale)}</span>
      </div>
      <div className="offer-savings">{t("store.offer.saving", { money: fmtMoney(savings) })}</div>
      <div className="scard-actions">
        <button
          className="buybtn buybtn-offer"
          disabled={gold < sale}
          onClick={() => notify(useShopStore.getState().buyCombo(def.id), def.icon)}
        >
          {t("store.offer.buy_combo")}
        </button>
      </div>
    </StoreCard>
  );
}
