import { useEffect } from "react";
import { useCropStore } from "../store/cropStore";
import { useGoodsStore } from "../store/goodsStore";
import { useEconomyStore } from "../store/economyStore";
import { useStorageStore } from "../store/storageStore";
import { useInteriorStore } from "../store/interiorStore";
import { CROP_ECONOMY, GOODS_ECONOMY } from "../config/economy";
import { useT } from "../store/languageStore";

const CROP_ICON: Record<string, string> = { wheat: "🌾", carrot: "🥕", potato: "🥔" };

function fmtPrice(n: number): string {
  return String(+n.toFixed(4));
}

export function CrateOverlay() {
  const t = useT();
  const focus = useStorageStore((s) => s.focus);
  const closeCrate = useStorageStore((s) => s.closeCrate);
  const cropInventory = useCropStore((s) => s.inventory);
  const sellHarvest = useCropStore((s) => s.sellHarvest);
  const goodsInventory = useGoodsStore((s) => s.inventory);
  const sellGoods = useGoodsStore((s) => s.sellGoods);
  const gold = useEconomyStore((s) => s.gold);
  const phase = useInteriorStore((s) => s.phase);

  useEffect(() => {
    if (phase !== "inside") closeCrate();
  }, [phase, closeCrate]);

  if (!focus) return null;
  const goodsEcon = GOODS_ECONOMY[focus.id];
  const cropEcon = CROP_ECONOMY[focus.id];
  if (!goodsEcon && !cropEcon) return null;
  const isGoods = !!goodsEcon;
  const econ = goodsEcon ?? cropEcon;
  const count = isGoods
    ? (goodsInventory[focus.id] ?? 0)
    : (cropInventory[focus.id]?.harvest ?? 0);
  const icon = isGoods ? goodsEcon.icon : (CROP_ICON[focus.id] ?? "📦");
  const subtitle = isGoods ? t("crate.goods_sub") : t("crate.crop_sub");
  const name = isGoods ? t(`product.${focus.id}`) : t(`crop.${focus.id}`);
  const sell = (qty: number) => (isGoods ? sellGoods(focus.id, qty) : sellHarvest(focus.id, qty));

  return (
    <div className="crateoverlay">
      <div className="crateoverlay-card">
        <div className="crateoverlay-head">
          <span className="crateoverlay-icon">{icon}</span>
          <div>
            <div className="crateoverlay-title">{name}</div>
            <div className="crateoverlay-sub">{subtitle}</div>
          </div>
        </div>
        <div className="crateoverlay-stats">
          <div className="crateoverlay-stat">
            <span>{t("crate.quantity")}</span>
            <b>{count}</b>
          </div>
          <div className="crateoverlay-stat">
            <span>{t("crate.sale_price")}</span>
            <b>${fmtPrice(econ.sellPrice)}</b>
          </div>
          <div className="crateoverlay-stat">
            <span>{t("crate.total_value")}</span>
            <b>${(count * econ.sellPrice).toFixed(2)}</b>
          </div>
        </div>
        <div className="crateoverlay-actions">
          <button className="btn" disabled={count < 1} onClick={() => sell(1)}>
            {t("crate.sell_1")}
          </button>
          <button className="btn primary" disabled={count < 1} onClick={() => sell(count)}>
            {t("crate.sell_all")}
          </button>
          <button className="btn" onClick={closeCrate}>
            {t("crate.close")}
          </button>
        </div>
        <div className="crateoverlay-hint">{t("crate.balance", { gold: gold.toFixed(2) })}</div>
      </div>
    </div>
  );
}
