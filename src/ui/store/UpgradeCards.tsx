import { useUpgradesStore } from "../../store/upgradesStore";
import { useEconomyStore } from "../../store/economyStore";
import { UPGRADES_ECONOMY, type BuildingUpgradeDef, type SpecialUpgradeDef } from "../../config/upgrades";
import { StoreCard, fmtMoney, type NotifyFn } from "./StoreUI";
import type { ShopResult } from "../../store/shopStore";

/**
 * MEJORAS: cada tarjeta muestra nivel actual, siguiente nivel, precio,
 * beneficio y botón MEJORAR. Usa la misma lógica que el panel de
 * infraestructura (upgradesStore).
 */
export function UpgradeCards({ notify }: { notify: NotifyFn }) {
  return (
    <div className="store-grid">
      {Object.values(UPGRADES_ECONOMY).map((def) => (
        <BuildingCard key={def.id} def={def} notify={notify} />
      ))}
    </div>
  );
}

function BuildingCard({ def, notify }: { def: BuildingUpgradeDef; notify: NotifyFn }) {
  const level = useUpgradesStore((s) => s.levels[def.id]);
  const gold = useEconomyStore((s) => s.gold);
  const capacity = useUpgradesStore((s) => s.capacityOf(def.id));
  const buyLevel = useUpgradesStore((s) => s.buyLevel);

  const cur = def.levels.find((l) => l.level === level);
  const next = def.levels.find((l) => l.level === level + 1) ?? null;
  const atMax = !next;
  const nextCapacity = next?.capacity ?? capacity;

  const benefit =
    def.type === "capacity"
      ? `Capacidad ${capacity} → ${next ? nextCapacity : capacity} ${def.unit}`
      : def.type === "speed"
        ? "Reduce el tiempo de producción"
        : "Reduce los costos de producción";

  const onBuy = () => {
    const ok = buyLevel(def.id);
    notify(
      ok
        ? { ok: true, message: `✓ ${def.name.toUpperCase()} MEJORADO`, detail: `Nivel ${level + 1}` }
        : insufficientUpgrade(next?.price ?? 0),
      def.icon
    );
  };

  return (
    <StoreCard className="scard-upgrade">
      <div className="scard-icon">{def.icon}</div>
      <div className="scard-title">{def.name.toUpperCase()}</div>
      <div className="scard-tags">
        <span className="scard-tag">Nivel {level}</span>
        <span className="scard-tag">{atMax ? "Máximo" : `Siguiente: Nivel ${next!.level}`}</span>
      </div>
      <div className="scard-detail">
        <b>{benefit}</b>
      </div>
      <div className="scard-total">
        {atMax ? "COMPLETADO" : <>Precio: <b>{fmtMoney(next!.price)}</b></>}
      </div>
      <button className="buybtn" disabled={atMax || gold < (next?.price ?? 0)} onClick={onBuy}>
        MEJORAR
      </button>

      {def.specials.length > 0 && (
        <div className="scard-specials">
          {def.specials.map((sp) => (
            <SpecialRow key={sp.id} special={sp} notify={notify} />
          ))}
        </div>
      )}
    </StoreCard>
  );
}

function SpecialRow({ special, notify }: { special: SpecialUpgradeDef; notify: NotifyFn }) {
  const owned = useUpgradesStore((s) => s.specials[special.id] === true);
  const gold = useEconomyStore((s) => s.gold);
  const buySpecial = useUpgradesStore((s) => s.buySpecial);

  const onBuy = () => {
    const ok = buySpecial(special.id);
    notify(
      ok
        ? { ok: true, message: `✓ ${special.name.toUpperCase()}`, detail: special.description }
        : insufficientUpgrade(special.price),
      special.icon
    );
  };

  return (
    <div className="scard-special">
      <span className="sp-icon">{special.icon}</span>
      <span className="sp-info">
        <span className="sp-name">{special.name}</span>
        <span className="sp-desc">{special.description}</span>
      </span>
      <button
        className="buybtn buybtn-sm"
        disabled={owned || gold < special.price}
        onClick={onBuy}
      >
        {owned ? "✓ ADQUIRIDA" : `COMPRAR ${fmtMoney(special.price)}`}
      </button>
    </div>
  );
}

function insufficientUpgrade(cost: number): ShopResult {
  return {
    ok: false,
    message: "❌ SALDO INSUFICIENTE",
    detail: `Necesitas ${fmtMoney(cost)} para esta mejora.`,
  };
}
