import { PRODUCT_ECONOMY, GOODS_ECONOMY, getProductEconomy } from "../../config/economy";
import { useT } from "../../store/languageStore";
import { StoreCard, fmtMoney, fmtProfit } from "./StoreUI";

const SOURCE_KEY: Record<string, string> = {
  egg: "store.source.egg",
  milk: "store.source.milk",
  meat: "store.source.meat",
  "boiled-egg": "store.source.boiled-egg",
  honey: "store.source.honey",
  cheese: "store.source.cheese",
};

/** Productos ocultos del catálogo (la economía central los conserva). */
const HIDDEN_PRODUCTS = new Set(["milk", "boiled-egg", "cheese", "honey"]);

/** Productos de la granja (solo los disponibles en cada economía). */
function productList(): Array<{ id: string; icon: string; price: number }> {
  const list: Array<{ id: string; icon: string; price: number }> = [];
  for (const [id, def] of Object.entries(PRODUCT_ECONOMY)) {
    if (HIDDEN_PRODUCTS.has(id)) continue;
    list.push({ id, icon: def.icon, price: def.price });
  }
  for (const [id, def] of Object.entries(GOODS_ECONOMY)) {
    if (PRODUCT_ECONOMY[id] || id === "eggs" || HIDDEN_PRODUCTS.has(id)) continue;
    list.push({ id, icon: def.icon, price: def.sellPrice });
  }
  return list;
}

/**
 * PRODUCTOS: catálogo de lo que la granja produce y su precio de venta,
 * siempre leído desde la economía central (nunca hardcodeado en la UI).
 */
export function ProductCards() {
  const t = useT();
  return (
    <div className="store-grid">
      {productList().map((p) => {
        const prod = getProductEconomy(p.id);
        return (
          <StoreCard key={p.id} className="scard-product">
            <div className="scard-icon">{p.icon}</div>
            <div className="scard-title">{t(`product.${p.id}`).toUpperCase()}</div>
            <div className="scard-tags">
              <span className="scard-tag">{t(SOURCE_KEY[p.id] ?? "store.product.source_default")}</span>
              <span className="scard-tag">
                {t("store.product.market", { market: t("store.product.market_default") })}
              </span>
            </div>
            <div className="scard-detail">
              {t("store.product.price")} <b className="scard-price">{fmtProfit(p.price)}</b>
              {prod && prod.price !== p.price ? ` ${t("store.product.ref", { money: fmtMoney(prod.price) })}` : ""}
            </div>
            <div className="scard-note">{t("store.product.note")}</div>
          </StoreCard>
        );
      })}
    </div>
  );
}
