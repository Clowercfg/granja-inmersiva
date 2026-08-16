import { StoreCard } from "./StoreUI";
import { useT } from "../../store/languageStore";

/**
 * EXPANSIONES: ampliaciones de terreno e instalaciones. Aún no hay sistema de
 * expansión: se muestran como tarjetas informativas deshabilitadas.
 */
export function ExpansionCards() {
  const t = useT();
  return (
    <div className="store-grid">
      <StoreCard className="scard-locked">
        <div className="scard-lock">🔒</div>
        <div className="scard-icon">🗺️</div>
        <div className="scard-title">{t("store.expansion.plots_title")}</div>
        <div className="scard-detail">{t("store.expansion.plots_desc")}</div>
        <div className="scard-note">{t("store.expansion.soon")}</div>
      </StoreCard>

      <StoreCard className="scard-locked">
        <div className="scard-lock">🔒</div>
        <div className="scard-icon">🐑</div>
        <div className="scard-title">{t("store.expansion.sheep_title")}</div>
        <div className="scard-detail">{t("store.expansion.sheep_desc")}</div>
        <div className="scard-note">{t("store.expansion.soon")}</div>
      </StoreCard>

      <StoreCard className="scard-locked">
        <div className="scard-lock">🔒</div>
        <div className="scard-icon">🏡</div>
        <div className="scard-title">{t("store.expansion.pond_title")}</div>
        <div className="scard-detail">{t("store.expansion.pond_desc")}</div>
        <div className="scard-note">{t("store.expansion.soon")}</div>
      </StoreCard>
    </div>
  );
}
