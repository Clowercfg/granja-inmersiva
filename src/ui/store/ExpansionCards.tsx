import { StoreCard } from "./StoreUI";

/**
 * EXPANSIONES: ampliaciones de terreno e instalaciones. Aún no hay sistema de
 * expansión: se muestran como tarjetas informativas deshabilitadas.
 */
export function ExpansionCards() {
  return (
    <div className="store-grid">
      <StoreCard className="scard-locked">
        <div className="scard-lock">🔒</div>
        <div className="scard-icon">🗺️</div>
        <div className="scard-title">NUEVAS PARCELAS</div>
        <div className="scard-detail">Amplía tus campos de cultivo desbloqueando nuevas parcelas al norte de la granja.</div>
        <div className="scard-note">Próximamente</div>
      </StoreCard>

      <StoreCard className="scard-locked">
        <div className="scard-lock">🔒</div>
        <div className="scard-icon">🐑</div>
        <div className="scard-title">CORRAL DE OVEJAS</div>
        <div className="scard-detail">Nueva especie para el oeste: produce lana, que podrás vender o procesar.</div>
        <div className="scard-note">Próximamente</div>
      </StoreCard>

      <StoreCard className="scard-locked">
        <div className="scard-lock">🔒</div>
        <div className="scard-icon">🏡</div>
        <div className="scard-title">ESTANQUE DE PECES</div>
        <div className="scard-detail">Cría peces en el estanque de la granja y cógelos cuando estén listos.</div>
        <div className="scard-note">Próximamente</div>
      </StoreCard>
    </div>
  );
}
