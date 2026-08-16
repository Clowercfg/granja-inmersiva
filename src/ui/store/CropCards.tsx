import { useState } from "react";
import { CROP_ECONOMY } from "../../config/economy";
import { useShopStore } from "../../store/shopStore";
import { StoreCard, QtyStepper, fmtMoney, fmtProfit, type NotifyFn } from "./StoreUI";

const CROP_ICON: Record<string, string> = { wheat: "🌾", corn: "🌽", carrot: "🥕", potato: "🥔" };

export function CropCards({ notify }: { notify: NotifyFn }) {
  return (
    <div className="store-grid">
      {Object.entries(CROP_ECONOMY).map(([id, def]) => (
        <CropCard key={id} cropId={id} name={def.name} icon={CROP_ICON[id] ?? "🌱"} notify={notify} />
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
  const [qty, setQty] = useState(10);
  const def = CROP_ECONOMY[cropId];
  const total = def.seedPrice * qty;

  return (
    <StoreCard className="scard-crop">
      <div className="scard-icon">{icon}</div>
      <div className="scard-title">{name.toUpperCase()}</div>
      <div className="scard-tags">
        <span className="scard-tag">⏱️ Crecimiento {def.growthHours} h</span>
        <span className="scard-tag">Ganancia {fmtProfit(def.profitPerUnit)}/ud</span>
      </div>
      <div className="scard-detail">Semilla <b className="scard-price">{fmtMoney(def.seedPrice)}</b></div>
      <QtyStepper value={qty} onChange={setQty} />
      <div className="scard-total">
        {qty} × {fmtMoney(def.seedPrice)} = <b>{fmtMoney(total)}</b>
      </div>
      <div className="scard-actions">
        <button
          className="buybtn"
          onClick={() => notify(useShopStore.getState().buySeed(cropId, qty), icon)}
        >
          COMPRAR
        </button>
      </div>
    </StoreCard>
  );
}
