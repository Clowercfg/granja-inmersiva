import { useEffect, useState } from "react";
import { useFarmStore } from "../../../store/farmStore";
import { useVetStore } from "../../../store/vetStore";
import { useEconomyStore } from "../../../store/economyStore";
import { getAnimalEconomy } from "../../../config/economy";
import { useT } from "../../../store/languageStore";
import { PanelShell, StatCell } from "./PanelShell";

const fmtPrice = (v: number) =>
  "$" + v.toFixed(2).replace(/\.00$/, "") + (Number.isInteger(v) ? ".00" : "");

function remainingHm(ms: number) {
  const h = Math.max(0, Math.floor(ms / 3_600_000));
  const m = Math.max(0, Math.floor((ms % 3_600_000) / 60_000));
  return `${h}h ${String(m).padStart(2, "0")}m`;
}

export function VetPanel() {
  const t = useT();
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
    <PanelShell icon="🩺" title={t("panel.vet.title")} subtitle={t("panel.vet.subtitle")}>
      <div className="panel-grid">
        <StatCell icon="🤒" label={t("panel.vet.sick")} value={rows.filter((r) => status(r.entry.id) === "sick").length} />
        <StatCell icon="⏳" label={t("panel.vet.recovering")} value={rows.filter((r) => status(r.entry.id) === "recovering").length} />
        <StatCell icon="🐾" label={t("panel.vet.population")} value={animals.length} />
        <StatCell icon="💰" label={t("panel.vet.pending")} value={fmtPrice(costePendiente)} />
      </div>

      {rows.length === 0 && (
        <div className="empty">
          {t("panel.vet.empty")} <span className="muted">{t("panel.vet.empty_ok")}</span>
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
                {animal.name} <span className="muted">· {t(`animal.${animal.kind}`)}</span>
              </div>
              <div className="panelrow-sub">
                {st === "sick" ? (
                  <span className="badge-warn">{t("panel.vet.sick_badge")}</span>
                ) : (
                  <span className="badge-info">
                    {t("panel.vet.recovering_badge", { time: remainingHm((entry.recoverAt ?? now) - now) })}
                  </span>
                )}
              </div>
              <div className="panelrow-sub muted">
                {t("panel.vet.treatment", {
                  price: fmtPrice(def.treatmentCost),
                  hours: def.recoveryHours,
                })}
              </div>
            </div>
            <div className="panelrow-side">
              <b>{st === "sick" ? t("panel.vet.treat_btn") : t("panel.vet.cured")}</b>
              <span className="muted">{fmtPrice(def.treatmentCost)}</span>
            </div>
            <div className="panelrow-actions">
              <button
                className="btn small primary"
                disabled={st !== "sick" || !canPay}
                onClick={() => useVetStore.getState().treat(entry.id)}
              >
                {st === "sick" ? t("panel.vet.treat") : t("panel.vet.in_progress")}
              </button>
            </div>
          </div>
        );
      })}

      <div className="hint">{t("panel.vet.hint")}</div>
    </PanelShell>
  );
}
