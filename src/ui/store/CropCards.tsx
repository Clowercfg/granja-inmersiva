import { useState } from "react";
import { CROP_ECONOMY } from "../../config/economy";
import { useShopStore } from "../../store/shopStore";
import { StoreCard, QtyStepper, fmtMoney, type NotifyFn } from "./StoreUI";

const CROP_ICON: Record<string, string> = { wheat: "🌾", carrot: "🥕", potato: "🥔" };

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
        <span className="scard-tag">Crecimiento {def.growthHours} h</span>
        <span className="scard-tag">Venta {fmtMoney(def.sellPrice)}</span>
        <span className="scard-tag">Ganancia {fmtMoney(def.profitPerUnit)}</span>
      </div>
      <div className="scard-detail">
        Semilla <b>{fmtMoney(def.seedPrice)}</b> · cantidad por compra
      </div>
      <QtyStepper value={qty} onChange={setQty} />
      <div className="scard-total">
        {qty} × {fmtMoney(def.seedPrice)} = <b>{fmtMoney(total)}</b>
      </div>
      <button
        className="buybtn"
        onClick={() => notify(useShopStore.getState().buySeed(cropId, qty), icon)}
      >
        COMPRAR
      </button>
    </StoreCard>
  );
}
