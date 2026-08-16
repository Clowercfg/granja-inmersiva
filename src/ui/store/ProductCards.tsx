import { PRODUCT_ECONOMY, GOODS_ECONOMY, getProductEconomy } from "../../config/economy";
import { StoreCard, fmtMoney } from "./StoreUI";

const PRODUCT_SOURCE: Record<string, string> = {
  egg: "Gallinas y gallos",
  milk: "Vacas",
  meat: "Cerdos",
  "boiled-egg": "Procesadora",
  honey: "Colmenas",
  cheese: "Procesadora",
};

const PRODUCT_MARKET: Record<string, string> = {
  egg: "Almacén",
  milk: "Almacén",
  meat: "Almacén",
  "boiled-egg": "Almacén",
  honey: "Almacén",
  cheese: "Almacén",
};

/** Productos de la granja (solo los disponibles en cada economía). */
function productList(): Array<{ id: string; name: string; icon: string; price: number }> {
  const list: Array<{ id: string; name: string; icon: string; price: number }> = [];
  for (const [id, def] of Object.entries(PRODUCT_ECONOMY)) {
    list.push({ id, name: def.name, icon: def.icon, price: def.price });
  }
  for (const [id, def] of Object.entries(GOODS_ECONOMY)) {
    if (PRODUCT_ECONOMY[id]) continue;
    list.push({ id, name: def.name, icon: def.icon, price: def.sellPrice });
  }
  return list;
}

/**
 * PRODUCTOS: catálogo de lo que la granja produce y su precio de venta,
 * siempre leído desde la economía central (nunca hardcodeado en la UI).
 */
export function ProductCards() {
  return (
    <div className="store-grid">
      {productList().map((p) => {
        const prod = getProductEconomy(p.id);
        return (
          <StoreCard key={p.id} className="scard-product">
            <div className="scard-icon">{p.icon}</div>
            <div className="scard-title">{p.name.toUpperCase()}</div>
            <div className="scard-tags">
              <span className="scard-tag">{PRODUCT_SOURCE[p.id] ?? "Producción"}</span>
              <span className="scard-tag">Venta: {PRODUCT_MARKET[p.id] ?? "Almacén"}</span>
            </div>
            <div className="scard-detail">
              Precio de venta <b className="scard-price">{fmtMoney(p.price)}</b>
              {prod && prod.price !== p.price ? ` (referencia ${fmtMoney(prod.price)})` : ""}
            </div>
            <div className="scard-note">Se vende automáticamente desde la granja o el almacén.</div>
          </StoreCard>
        );
      })}

      <StoreCard className="scard-info">
        <div className="scard-icon">🐣</div>
        <div className="scard-title">REPRODUCCIÓN</div>
        <div className="scard-detail">
          Los gallos producen <b>huevos fertilizados</b> mientras haya gallinas en el corral.
        </div>
        <div className="scard-detail">
          Un huevo fertilizado eclosiona tras <b>72 h</b> en la incubadora y el pollito se cría
          otras <b>72 h</b> hasta ser adulto (70% sin resultado · 25% gallina · 5% gallo).
        </div>
      </StoreCard>
    </div>
  );
}
