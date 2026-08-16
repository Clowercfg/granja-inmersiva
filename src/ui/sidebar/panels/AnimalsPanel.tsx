import { useEffect, useState } from "react";
import { useFarmStore } from "../../../store/farmStore";
import type { AnimalAgent, AnimalKind } from "../../../types";
import { ENCLOSURE_BY_KIND } from "../../../config/enclosures";
import { useT } from "../../../store/languageStore";
import { PanelShell, StatCell } from "./PanelShell";

const STATE_LABEL: Record<AnimalAgent["state"], string> = {
  rest: "animalState.rest",
  wander: "animalState.wander",
  eating: "animalState.eating",
  sleep: "animalState.sleep",
};

const ANIMAL_ICON: Record<AnimalKind, string> = {
  cow: "🐄",
  chicken: "🐔",
  rooster: "🐓",
  pig: "🐖",
};

function AnimalRow({ a }: { a: AnimalAgent }) {
  const t = useT();
  const health = Math.round(a.health);
  const location = t(`enclosure.${ENCLOSURE_BY_KIND[a.kind].id}`);
  return (
    <div className="panelrow">
      <div className="panelrow-icon">{ANIMAL_ICON[a.kind]}</div>
      <div className="panelrow-main">
        <div className="panelrow-title">{a.name}</div>
        <div className="panelrow-sub">
          {t(STATE_LABEL[a.state])} · {location}
        </div>
        <div className={`bar ${health > 60 ? "good" : "warn"}`} style={{ width: "100%" }}>
          <div style={{ width: `${health}%` }} />
        </div>
      </div>
      <div className="panelrow-side">
        <b>{health}%</b>
        <span className="muted">{t("panel.animals.mood", { pct: Math.round(a.mood * 100) })}</span>
      </div>
    </div>
  );
}

export function AnimalsPanel() {
  const t = useT();
  const animals = useFarmStore((s) => s.animals);
  const [, setTick] = useState(0);

  useEffect(() => {
    const iv = setInterval(() => setTick((t) => t + 1), 500);
    return () => clearInterval(iv);
  }, []);

  const byKind: Record<AnimalKind, number> = {
    cow: 0,
    chicken: 0,
    rooster: 0,
    pig: 0,
  };
  for (const a of animals) byKind[a.kind] += 1;

  return (
    <PanelShell icon="🐄" title={t("panel.animals.title")} subtitle={t("panel.animals.subtitle")}>
      <div className="panel-grid">
        <StatCell icon="🐄" label={t("species.cow")} value={byKind.cow} />
        <StatCell icon="🐔" label={t("species.chicken")} value={byKind.chicken} />
        <StatCell icon="🐓" label={t("species.rooster")} value={byKind.rooster} />
        <StatCell icon="🐖" label={t("species.pig")} value={byKind.pig} />
      </div>

      {animals.length === 0 && (
        <div className="empty">{t("panel.animals.empty")}</div>
      )}
      {animals.map((a) => (
        <AnimalRow key={a.id} a={a} />
      ))}

      <div className="hint">{t("panel.animals.hint")}</div>
    </PanelShell>
  );
}
