import { useEffect, useRef, useState } from "react";
import { useUpgradesStore } from "../../../store/upgradesStore";
import { useEconomyStore } from "../../../store/economyStore";
import { UPGRADE_BUILDINGS, type BuildingUpgradeDef, type SpecialUpgradeDef } from "../../../config/upgrades";
import { PanelShell, StatCell } from "./PanelShell";

const TYPE_TAG: Record<string, string> = {
  capacity: "🟢 Capacidad",
  speed: "🔵 Velocidad",
  efficiency: "🟡 Eficiencia",
};

function fmtPrice(v: number): string {
  if (v === 0) return "GRATIS";
  return "$" + v.toFixed(2).replace(/\.00$/, "");
}

function paybackDays(price: number, gain: number | undefined): number | null {
  if (!gain || gain <= 0 || price <= 0) return null;
  return Math.max(1, Math.ceil(price / gain));
}

function SpecialRow({ building, special }: { building: BuildingUpgradeDef; special: SpecialUpgradeDef }) {
  const bought = useUpgradesStore((s) => !!s.specials[special.id]);
  const gold = useEconomyStore((s) => s.gold);
  const missing = Math.max(0, special.price - gold);
  const roi = paybackDays(special.price, special.estDailyGain);

  return (
    <div className={`panelrow upgrade-special ${bought ? "owned" : ""}`}>
      <div className="panelrow-icon">{special.icon}</div>
      <div className="panelrow-main">
        <div className="panelrow-title">
          {special.name} <span className={`status-chip ${bought ? "status-ok" : "status-idle"}`}>{bought ? "Comprada" : TYPE_TAG[special.type]}</span>
        </div>
        <div className="panelrow-sub">{special.description}</div>
        {roi !== null && (
          <div className="panelrow-sub muted">Recuperación estimada: ≈ {roi} día{roi === 1 ? "" : "s"}</div>
        )}
      </div>
      <div className="panelrow-side">
        <b>{fmtPrice(special.price)}</b>
        {!bought && missing > 0 && <span className="muted">faltan {fmtPrice(missing)}</span>}
      </div>
      <div className="panelrow-actions">
        <button
          className="btn small primary"
          disabled={bought || missing > 0}
          onClick={() => useUpgradesStore.getState().buySpecial(special.id)}
        >
          {bought ? "✓ Comprada" : "MEJORAR"}
        </button>
      </div>
    </div>
  );
}

function BuildingCard({ def }: { def: BuildingUpgradeDef }) {
  const level = useUpgradesStore((s) => s.levels[def.id]);
  const gold = useEconomyStore((s) => s.gold);
  const [, setTick] = useState(0);
  const confirmRef = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    const iv = setInterval(() => setTick((t) => t + 1), 1000);
    return () => clearInterval(iv);
  }, []);

  const nextDef = level >= def.levels.length ? null : (def.levels.find((l) => l.level === level + 1) ?? null);
  const curDef = def.levels.find((l) => l.level === level);
  const capacity = curDef?.capacity ?? 0;
  const nextCapacity = nextDef?.capacity ?? capacity;
  const atMax = nextDef === null;
  const price = nextDef?.price ?? 0;
  const missing = atMax ? 0 : Math.max(0, price - gold);
  const delta = atMax ? 0 : Math.max(0, nextCapacity - capacity);
  const gain = atMax ? undefined : def.estDailyGainPerUnit * delta;
  const roi = paybackDays(price, atMax ? undefined : gain);

  const onBuy = () => {
    if (useUpgradesStore.getState().buyLevel(def.id) && confirmRef.current) {
      confirmRef.current.textContent = `✓ Compra realizada: ${def.name} Nivel ${useUpgradesStore.getState().levels[def.id]}`;
      setTimeout(() => {
        if (confirmRef.current) confirmRef.current.textContent = "";
      }, 3000);
    }
  };

  return (
    <div className="pansection upgrade-card">
      <div className="pansection-head">
        <span className="pansection-title">
          {def.icon} {def.name.toUpperCase()}
        </span>
        <span className="upgrade-level">
          {nextDef ? `NIVEL ${level} → ${nextDef.level}` : `NIVEL ${level} · MÁXIMO`}
        </span>
      </div>
      <div className="pansection-body">
        <div className="panelrow">
          <div className="panelrow-icon">{def.icon}</div>
          <div className="panelrow-main">
            <div className="panelrow-title">
              Capacidad {capacity} → {atMax ? capacity : nextCapacity} {def.unit}
            </div>
            <div className="panelrow-sub">
              {atMax
                ? "Máximo nivel alcanzado."
                : `Beneficio: +${delta} ${def.unit} de capacidad.`}
            </div>
            {!atMax && roi !== null && (
              <div className="panelrow-sub muted">
                Recuperación estimada: ≈ {roi} día{roi === 1 ? "" : "s"}
              </div>
            )}
          </div>
          <div className="panelrow-side">
            <b>{fmtPrice(price)}</b>
            {!atMax && missing > 0 && <span className="muted">faltan {fmtPrice(missing)}</span>}
          </div>
          <div className="panelrow-actions">
            <button
              className="btn small primary"
              disabled={atMax || missing > 0}
              onClick={onBuy}
            >
              {atMax ? "MÁXIMO" : "🏗️ MEJORAR"}
            </button>
          </div>
        </div>

        {def.specials.map((sp) => (
          <SpecialRow key={sp.id} building={def} special={sp} />
        ))}

        <span className="upgrade-confirm" ref={confirmRef} />
      </div>
    </div>
  );
}

export function UpgradesPanel() {
  const gold = useEconomyStore((s) => s.gold);
  const [, setTick] = useState(0);

  useEffect(() => {
    const iv = setInterval(() => setTick((t) => t + 1), 1000);
    return () => clearInterval(iv);
  }, []);

  const purchased = useUpgradesStore((s) =>
    UPGRADE_BUILDINGS.reduce((acc, d) => acc + (s.levels[d.id] - d.startLevel), 0) +
    Object.values(s.specials).filter(Boolean).length
  );

  return (
    <PanelShell icon="🏗️" title="Mejoras" subtitle="Niveles, capacidades y eficiencia de tus edificios">
      <div className="panel-grid">
        <StatCell icon="💰" label="Saldo disponible" value={"$" + gold.toFixed(2).replace(/\.00$/, "")} />
        <StatCell icon="🏗️" label="Edificios mejorables" value={UPGRADE_BUILDINGS.length} />
        <StatCell icon="📈" label="Mejoras compradas" value={purchased} />
      </div>

      <div className="hint">
        Las mejoras no generan dinero directamente: aumentan capacidad, velocidad o eficiencia. El costo se
        descuenta de tu saldo al instante y solo puedes comprar en orden (nivel a nivel).
      </div>

      {UPGRADE_BUILDINGS.map((def) => (
        <BuildingCard key={def.id} def={def} />
      ))}

      <div className="hint">
        Los tiempos de recuperación son orientativos y no garantizan rentabilidad: dependen del uso real que
        hagas de cada mejora.
      </div>
    </PanelShell>
  );
}
