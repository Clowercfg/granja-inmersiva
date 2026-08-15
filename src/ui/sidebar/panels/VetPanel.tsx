import { useEffect, useState } from "react";
import { useFarmStore } from "../../../store/farmStore";
import { useVetStore } from "../../../store/vetStore";
import { useEconomyStore } from "../../../store/economyStore";
import { getAnimalEconomy } from "../../../config/economy";
import { PanelShell, StatCell } from "./PanelShell";

const fmtPrice = (v: number) =>
  "$" + v.toFixed(2).replace(/\.00$/, "") + (Number.isInteger(v) ? ".00" : "");

function remainingHm(ms: number) {
  const h = Math.max(0, Math.floor(ms / 3_600_000));
  const m = Math.max(0, Math.floor((ms % 3_600_000) / 60_000));
  return `${h}h ${String(m).padStart(2, "0")}m`;
}

export function VetPanel() {
  const animals = useFarmStore((s) => s.animals);
  const sick = useVetStore((s) => s.sick);
  const gold = useEconomyStore((s) => s.gold);
  const [, setTick] = useState(0);

  useEffect(() => {
    const iv = setInterval(() => setTick((t) => t + 1), 1000);
    return () => clearInterval(iv);
  }, []);

  const rows = Object.values(sick)
    .map((e) => {
      const animal = animals.find((a) => a.id === e.id);
      return animal ? { entry: e, animal } : null;
    })
    .filter((r): r is { entry: (typeof sick)[number]; animal: (typeof animals)[number] } => r !== null);

  const status = useVetStore.getState().statusOf;
  const now = Date.now();
  const costePendiente = rows.reduce(
    (acc, r) => acc + (status(r.entry.id) === "sick" ? getAnimalEconomy(r.animal.kind)?.treatmentCost ?? 0 : 0),
    0
  );

  return (
    <PanelShell icon="🩺" title="Veterinario" subtitle="Salud de tu ganado y tratamientos">
      <div className="panel-grid">
        <StatCell icon="🤒" label="Enfermos" value={rows.filter((r) => status(r.entry.id) === "sick").length} />
        <StatCell icon="⏳" label="Recuperándose" value={rows.filter((r) => status(r.entry.id) === "recovering").length} />
        <StatCell icon="🐾" label="Población" value={animals.length} />
        <StatCell icon="💰" label="Tratamientos pend." value={fmtPrice(costePendiente)} />
      </div>

      {rows.length === 0 && (
        <div className="empty">
          No hay animales enfermos. <span className="muted">Los corrales están sanos. 🎉</span>
        </div>
      )}

      {rows.map(({ entry, animal }) => {
        const def = getAnimalEconomy(animal.kind);
        if (!def) return null;
        const st = status(entry.id);
        const canPay = gold >= def.treatmentCost;
        return (
          <div className="panelrow" key={entry.id}>
            <div className="panelrow-icon">{def.icon}</div>
            <div className="panelrow-main">
              <div className="panelrow-title">
                {animal.name} <span className="muted">· {def.name}</span>
              </div>
              <div className="panelrow-sub">
                {st === "sick" ? (
                  <span className="badge-warn">Enfermo</span>
                ) : (
                  <span className="badge-info">
                    En recuperación · {remainingHm((entry.recoverAt ?? now) - now)}
                  </span>
                )}
              </div>
              <div className="panelrow-sub muted">
                Tratamiento {fmtPrice(def.treatmentCost)} · Recuperación {def.recoveryHours} h
              </div>
            </div>
            <div className="panelrow-side">
              <b>{st === "sick" ? "⚠️ Tratar" : "🩹 Curado"}</b>
              <span className="muted">{fmtPrice(def.treatmentCost)}</span>
            </div>
            <div className="panelrow-actions">
              <button
                className="btn small primary"
                disabled={st !== "sick" || !canPay}
                onClick={() => useVetStore.getState().treat(entry.id)}
              >
                {st === "sick" ? "Tratar" : "En curso"}
              </button>
            </div>
          </div>
        );
      })}

      <div className="hint">
        En una granja de referencia (~20 animales) enferma 1 animal cada 9 días aproximadamente; cada
        animal solo puede enfermar como mínimo cada 14 días. Solo pagas el tratamiento cuando lo decides,
        no necesitas saldo reservado, y ningún animal se elimina por estar enfermo.
      </div>
    </PanelShell>
  );
}
