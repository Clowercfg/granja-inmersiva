import { getAnimalEconomy } from "../../config/economy";
import { useT } from "../../store/languageStore";
import type { AnimalKind } from "../../types";
import { StoreCard, fmtMoney } from "./StoreUI";

const ANIMAL_ORDER: AnimalKind[] = ["chicken", "rooster", "cow", "pig"];

/**
 * ALIMENTACIÓN: coste de alimentación por animal (referencia desde la economía
 * central). Los costos de mantenimiento se cobran al finalizar cada ciclo.
 */
export function FeedCards() {
  const t = useT();
  return (
    <div className="store-grid">
      {ANIMAL_ORDER.map((kind) => {
        const def = getAnimalEconomy(kind);
        if (!def) return null;
        return (
          <StoreCard key={kind} className="scard-feed">
            <div className="scard-icon">{def.icon}</div>
            <div className="scard-title">{t(`animal.${kind}`).toUpperCase()}</div>
            <div className="scard-tags">
              <span className="scard-tag">{t("store.feed.feed")}</span>
            </div>
            <div className="scard-detail">
              {t("store.feed.cost")} <b className="scard-price">{fmtMoney(def.feedCost)}</b> /{" "}
              {t(`feedPeriod.${def.feedPeriod === "día" ? "day" : "cycle"}`)}
            </div>
            <div className="scard-note">{t("store.feed.note")}</div>
          </StoreCard>
        );
      })}
      <StoreCard className="scard-info">
        <div className="scard-icon">🌾</div>
        <div className="scard-title">{t("store.feed.how_title")}</div>
        <div className="scard-detail">{t("store.feed.how_1")}</div>
        <div className="scard-detail">
          <b>{t("store.info_3")}.</b> {t("store.feed.how_2")}
        </div>
      </StoreCard>
    </div>
  );
}
