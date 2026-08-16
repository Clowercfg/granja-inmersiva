import { PROCESS_LIST, type ProcessDef } from "../../config/processing";
import { getProductEconomy } from "../../config/economy";
import { StoreCard, fmtMoney } from "./StoreUI";

/**
 * PROCESAMIENTO: categoría informativa. Muestra qué productos pueden
 * procesarse, con sus precios siempre desde PRODUCT_ECONOMY.
 */
export function ProcessCards() {
  return (
    <div className="store-grid">
      {PROCESS_LIST.map((def) => (
        <ProcessCard key={def.id} def={def} />
      ))}
      <StoreCard className="scard-info">
        <div className="scard-icon">🏭</div>
        <div className="scard-title">PROCESADORA</div>
        <div className="scard-detail">
          La máquina procesadora convierte productos de la granja en productos con más valor de venta.
        </div>
        <div className="scard-detail">
          Se desbloquea mejorando la infraestructura en la categoría <b>MEJORAS</b>.
        </div>
      </StoreCard>
    </div>
  );
}

function ProcessCard({ def }: { def: ProcessDef }) {
  const input = getProductEconomy(def.input.productId);
  const output = getProductEconomy(def.output.productId);
  if (!input || !output) return null;

  return (
    <StoreCard className="scard-process">
      <div className="scard-title">PROCESO: {def.id.toUpperCase().replace("-", " ")}</div>
      <div className="proc-flow">
        <div className="proc-side">
          <div className="proc-icon">{input.icon}</div>
          <div className="proc-name">{input.name}</div>
          <div className="proc-price">{fmtMoney(input.price)}</div>
        </div>
        <div className="proc-mid">
          <span className="proc-arrow">→</span>
          <span className="proc-meta">
            {def.processHours} h · {fmtMoney(def.cost)}
          </span>
          <span className="proc-machine">🏭 {def.machine}</span>
        </div>
        <div className="proc-side">
          <div className="proc-icon">{output.icon}</div>
          <div className="proc-name">{output.name}</div>
          <div className="proc-price ok">{fmtMoney(output.price)}</div>
        </div>
      </div>
      <div className="scard-tags">
        <span className="scard-tag">Margen +{fmtMoney(output.price - input.price)}</span>
        <span className="scard-tag">{def.input.qty} → {def.output.qty} unidad</span>
      </div>
    </StoreCard>
  );
}
