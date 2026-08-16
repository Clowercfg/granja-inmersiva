import { getAnimalEconomy } from "../../config/economy";
import type { AnimalKind } from "../../types";
import { StoreCard, fmtMoney } from "./StoreUI";

const ANIMAL_ORDER: AnimalKind[] = ["chicken", "rooster", "cow", "pig"];

const FEED_LABEL: Record<AnimalKind, string> = {
  chicken: "Gallina",
  rooster: "Gallo",
  cow: "Vaca",
  pig: "Cerdo",
};

/**
 * ALIMENTACIÓN: coste de alimentación por animal (referencia desde la economía
 * central). Los costos de mantenimiento se cobran al finalizar cada ciclo.
 */
export function FeedCards() {
  return (
    <div className="store-grid">
      {ANIMAL_ORDER.map((kind) => {
        const def = getAnimalEconomy(kind);
        if (!def) return null;
        return (
          <StoreCard key={kind} className="scard-feed">
            <div className="scard-icon">{def.icon}</div>
            <div className="scard-title">{FEED_LABEL[kind].toUpperCase()}</div>
            <div className="scard-tags">
              <span className="scard-tag">🌾 Alimentación</span>
            </div>
            <div className="scard-detail">
              Coste: <b className="scard-price">{fmtMoney(def.feedCost)}</b> / {def.feedPeriod}
            </div>
            <div className="scard-note">
              El costo de alimentación y mantenimiento se cobra al finalizar cada ciclo.
            </div>
          </StoreCard>
        );
      })}
      <StoreCard className="scard-info">
        <div className="scard-icon">🌾</div>
        <div className="scard-title">CÓMO FUNCIONA</div>
        <div className="scard-detail">
          Cada animal consume forraje según su especie. Los cerdos pagan su alimentación por
          ciclo de engorde (7 días); el resto, por día.
        </div>
        <div className="scard-detail">
          <b>Más producción = más ganancias.</b> Mantén a tus animales sanos y alimentados.
        </div>
      </StoreCard>
    </div>
  );
}
