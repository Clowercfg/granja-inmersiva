import { PROCESS_LIST, type ProcessDef } from "../../config/processing";
import { getProductEconomy } from "../../config/economy";
import { useT } from "../../store/languageStore";
import { StoreCard, fmtMoney } from "./StoreUI";

/**
 * PROCESAMIENTO: categoría informativa. Muestra qué productos pueden
 * procesarse, con sus precios siempre desde PRODUCT_ECONOMY.
 */
export function ProcessCards() {
  const t = useT();
  return (
    <div className="store-grid">
      {PROCESS_LIST.map((def) => (
        <ProcessCard key={def.id} def={def} />
      ))}
      <StoreCard className="scard-info">
        <div className="scard-icon">🏭</div>
        <div className="scard-title">{t("process.info_title")}</div>
        <div className="scard-detail">{t("process.info_1")}</div>
        <div className="scard-detail">{t("process.info_2")}</div>
      </StoreCard>
    </div>
  );
}

function ProcessCard({ def }: { def: ProcessDef }) {
  const t = useT();
  const input = getProductEconomy(def.input.productId);
  const output = getProductEconomy(def.output.productId);
  if (!input || !output) return null;

  return (
    <StoreCard className="scard-process">
      <div className="scard-title">{t(`process.${def.id}.title`)}</div>
      <div className="proc-flow">
        <div className="proc-side">
          <div className="proc-icon">{input.icon}</div>
          <div className="proc-name">{t(`product.${def.input.productId}`)}</div>
          <div className="proc-price">{fmtMoney(input.price)}</div>
        </div>
        <div className="proc-mid">
          <span className="proc-arrow">→</span>
          <span className="proc-meta">
            {def.processHours} h · {fmtMoney(def.cost)}
          </span>
          <span className="proc-machine">🏭 {t("process.machine")}</span>
        </div>
        <div className="proc-side">
          <div className="proc-icon">{output.icon}</div>
          <div className="proc-name">{t(`product.${def.output.productId}`)}</div>
          <div className="proc-price ok">{fmtMoney(output.price)}</div>
        </div>
      </div>
      <div className="scard-tags">
        <span className="scard-tag">{t("store.process.margin", { margin: fmtMoney(output.price - input.price) })}</span>
        <span className="scard-tag">
          {t("process.conversion", { in: def.input.qty, out: def.output.qty, n: def.output.qty })}
        </span>
      </div>
    </StoreCard>
  );
}
