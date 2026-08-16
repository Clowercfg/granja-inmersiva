import { useEffect, useState } from "react";
import { useFarmStore } from "../../../store/farmStore";
import type { AnimalAgent, AnimalKind } from "../../../types";
import { ENCLOSURE_BY_KIND } from "../../../config/enclosures";
import { PanelShell, StatCell } from "./PanelShell";

const STATE_LABEL: Record<AnimalAgent["state"], string> = {
  rest: "Descansando",
  wander: "Paseando",
  eating: "Paciendo",
  sleep: "Durmiendo",
};

const ANIMAL_ICON: Record<AnimalKind, string> = {
  cow: "🐄",
  chicken: "🐔",
  rooster: "🐓",
  pig: "🐖",
};

const SPECIES_NAME: Record<AnimalKind, string> = {
  cow: "Vacas",
  chicken: "Gallinas",
  rooster: "Gallos",
  pig: "Cerdos",
};

function locationOf(a: AnimalAgent): string {
  return ENCLOSURE_BY_KIND[a.kind].name;
}

function AnimalRow({ a }: { a: AnimalAgent }) {
  const health = Math.round(a.health);
  return (
    <div className="panelrow">
      <div className="panelrow-icon">{ANIMAL_ICON[a.kind]}</div>
      <div className="panelrow-main">
        <div className="panelrow-title">{a.name}</div>
        <div className="panelrow-sub">
          {STATE_LABEL[a.state]} · {locationOf(a)}
        </div>
        <div className={`bar ${health > 60 ? "good" : "warn"}`} style={{ width: "100%" }}>
          <div style={{ width: `${health}%` }} />
        </div>
      </div>
      <div className="panelrow-side">
        <b>{health}%</b>
        <span className="muted">{Math.round(a.mood * 100)}% ánimo</span>
      </div>
    </div>
  );
}

export function AnimalsPanel() {
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

  const avgHealth =
    animals.length === 0
      ? 100
      : Math.round(animals.reduce((acc, a) => acc + a.health, 0) / animals.length);

  return (
    <PanelShell icon="🐄" title="Animales" subtitle="Población y estado de tu ganado">
      <div className="panel-grid">
        <StatCell icon="🐄" label="Vacas" value={byKind.cow} />
        <StatCell icon="🐔" label="Gallinas" value={byKind.chicken} />
        <StatCell icon="🐓" label="Gallos" value={byKind.rooster} />
        <StatCell icon="🐖" label="Cerdos" value={byKind.pig} />
      </div>

      {animals.length === 0 && (
        <div className="empty">No hay animales en los corrales.</div>
      )}
      {animals.map((a) => (
        <AnimalRow key={a.id} a={a} />
      ))}

      <div className="hint">
        Las vacas viven en su corral, los cerdos en la pocilga y las aves en el corral de aves.
        Durante el día pasean y pastan dentro de su área; por la noche se echan a dormir.
      </div>
    </PanelShell>
  );
}
