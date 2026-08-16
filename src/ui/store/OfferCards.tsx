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
import { StoreCard, fmtMoney, type NotifyFn } from "./StoreUI";

const CROP_ICON: Record<string, string> = { wheat: "🌾", corn: "🌽", carrot: "🥕", potato: "🥔" };

function itemLabel(item: OfferDef["items"][number]): string {
  if (item.type === "seed") {
    const def = getCropEconomy(item.cropId);
    return `${item.qty}× ${CROP_ICON[item.cropId] ?? "🌱"} ${def?.name ?? item.cropId}`;
  }
  const def = getAnimalEconomy(item.kind);
  return `${item.qty}× ${def?.icon ?? "🐾"} ${def?.name ?? item.kind}`;
}

export function OfferCards({ notify }: { notify: NotifyFn }) {
  return (
    <div className="store-grid">
      {OFFER_LIST.map((def) => (
        <OfferCard key={def.id} def={def} notify={notify} />
      ))}
    </div>
  );
}

function OfferCard({ def, notify }: { def: OfferDef; notify: NotifyFn }) {
  const gold = useEconomyStore((s) => s.gold);
  const normal = offerNormalPrice(def);
  const sale = offerSalePrice(def);
  const savings = offerSavings(def);
  const discount = effectiveDiscount(def) * 100;

  return (
    <StoreCard className="scard-offer">
      <div className="offer-badge">-{Math.round(discount)}%</div>
      <div className="scard-icon">{def.icon}</div>
      <div className="scard-title">{def.name.toUpperCase()}</div>
      <div className="scard-detail">{def.description}</div>
      <div className="offer-items">
        {def.items.map((item, i) => (
          <div key={i} className="offer-item">
            {itemLabel(item)}
          </div>
        ))}
      </div>
      <div className="offer-prices">
        <span className="offer-normal">
          <s>{fmtMoney(normal)}</s>
        </span>
        <span className="offer-sale">{fmtMoney(sale)}</span>
      </div>
      <div className="offer-savings">AHORRO {fmtMoney(savings)}</div>
      <div className="scard-actions">
        <button
          className="buybtn buybtn-offer"
          disabled={gold < sale}
          onClick={() => notify(useShopStore.getState().buyCombo(def.id), def.icon)}
        >
          COMPRAR COMBO
        </button>
      </div>
    </StoreCard>
  );
}
