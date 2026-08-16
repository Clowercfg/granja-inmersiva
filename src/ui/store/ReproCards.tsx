import { StoreCard } from "./StoreUI";

/**
 * REPRODUCCIÓN: categoría informativa. Los animales de la granja producen
 * de forma automática; aquí se explica cómo funciona la reproducción y la
 * cría de pollitos.
 */
export function ReproCards() {
  return (
    <div className="store-grid">
      <StoreCard className="scard-info">
        <div className="scard-icon">🐓</div>
        <div className="scard-title">REPRODUCCIÓN</div>
        <div className="scard-detail">
          Los gallos producen <b>huevos fertilizados</b> mientras haya gallinas en el corral.
        </div>
        <div className="scard-detail">
          Un huevo fertilizado eclosiona tras <b>72 horas</b> y nace un pollito, que se cría durante
          otras <b>72 horas</b> hasta convertirse en adulto.
        </div>
      </StoreCard>

      <StoreCard className="scard-info">
        <div className="scard-icon">🥚</div>
        <div className="scard-title">RESULTADOS DE LA INCUBACIÓN</div>
        <div className="scard-flow">
          <span className="flow-step">🥚 Huevo fertilizado</span>
          <span className="flow-arrow">→</span>
          <span className="flow-step">♨️ Incubadora · 72 h</span>
          <span className="flow-arrow">→</span>
          <span className="flow-step">🐤 Pollito · 72 h</span>
          <span className="flow-arrow">→</span>
          <span className="flow-step">🐔 Adulto</span>
        </div>
        <div className="scard-detail">
          Probabilidades: <b>70%</b> sin resultado · <b>25%</b> nace una gallina · <b>5%</b> nace un gallo.
        </div>
      </StoreCard>

      <StoreCard className="scard-info">
        <div className="scard-icon">🐄</div>
        <div className="scard-title">GANADO</div>
        <div className="scard-detail">
          Vacas y cerdos se crían comprando nuevas crías en la categoría <b>ANIMALES</b>.
        </div>
        <div className="scard-detail">
          Crecen durante el día y por la noche duermen dentro de su corral. Cuidar su salud aumenta su
          producción.
        </div>
      </StoreCard>
    </div>
  );
}
