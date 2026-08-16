import { useState } from "react";
import { CROP_ECONOMY } from "../../config/economy";
import { useShopStore } from "../../store/shopStore";
import { useT } from "../../store/languageStore";
import { StoreCard, QtyStepper, fmtMoney, fmtProfit, type NotifyFn } from "./StoreUI";

const CROP_ICON: Record<string, string> = { wheat: "🌾", corn: "🌽", carrot: "🥕", potato: "🥔" };

export function CropCards({ notify }: { notify: NotifyFn }) {
  const t = useT();
  return (
    <div className="store-grid">
      {Object.entries(CROP_ECONOMY).map(([id, def]) => (
        <CropCard key={id} cropId={id} name={t(`crop.${id}`)} icon={CROP_ICON[id] ?? "🌱"} notify={notify} />
      ))}
    </div>
  );
}

function CropCard({
  cropId,
  name,
  icon,
  notify,
}: {
  cropId: string;
  name: string;
  icon: string;
  notify: NotifyFn;
}) {
  const t = useT();
  const [qty, setQty] = useState(10);
  const def = CROP_ECONOMY[cropId];
  const total = def.seedPrice * qty;

  return (
    <StoreCard className="scard-crop">
      <div className="scard-icon">{icon}</div>
      <div className="scard-title">{name.toUpperCase()}</div>
      <div className="scard-tags">
        <span className="scard-tag">{t("store.crop.growth", { hours: def.growthHours })}</span>
        <span className="scard-tag">{t("store.crop.profit", { profit: fmtProfit(def.profitPerUnit) })}</span>
      </div>
      <div className="scard-detail">
        {t("store.crop.seed")} <b className="scard-price">{fmtMoney(def.seedPrice)}</b>
      </div>
      <QtyStepper value={qty} onChange={setQty} />
      <div className="scard-total">
        {qty} × {fmtMoney(def.seedPrice)} = <b>{fmtMoney(total)}</b>
      </div>
      <div className="scard-actions">
        <button
          className="buybtn"
          onClick={() => notify(useShopStore.getState().buySeed(cropId, qty), icon)}
        >
          {t("store.buy")}
        </button>
      </div>
    </StoreCard>
  );
}
