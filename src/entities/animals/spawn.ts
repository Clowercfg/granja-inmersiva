import type { AnimalAgent, AnimalKind } from "../../types";
import { useFarmStore } from "../../store/farmStore";
import { terrainHeight } from "../../utils/terrain";
import { makeRng } from "../../utils/math";
import { ENCLOSURE_BY_KIND } from "../../config/enclosures";

let idCounter = 1;

function makeAgent(
  kind: AnimalKind,
  name: string,
  rng: () => number
): AnimalAgent {
  const enc = ENCLOSURE_BY_KIND[kind];
  const b = enc.bounds;
  const margin = 2;
  const x = b.minX + margin + rng() * (b.maxX - b.minX - margin * 2);
  const z = b.minZ + margin + rng() * (b.maxZ - b.minZ - margin * 2);
  const now = Date.now() / 1000;
  return {
    id: idCounter++,
    kind,
    name,
    position: [x, terrainHeight(x, z), z],
    rotation: rng() * Math.PI * 2,
    velocity: [0, 0, 0],
    state: "rest",
    target: [x, 0, z],
    bounds: b,
    actionTimer: rng() * 3,
    mood: 0.8 + rng() * 0.2,
    health: 100,
    scale: kind === "cow" ? 0.95 + rng() * 0.2 : 0.9 + rng() * 0.3,
    walkPhase: rng() * Math.PI * 2,
    idlePhase: rng() * Math.PI * 2,
    speed: 1,
    pendingProduction: 0,
    nextHarvestAt: now + (kind === "cow" ? 20 : 15),
  };
}

export function spawnInitialAnimals(): void {
  const rng = makeRng(987654321);
  const store = useFarmStore.getState();

  for (let i = 1; i <= 8; i++) {
    store.registerAnimal(makeAgent("cow", `VACA #${String(i).padStart(3, "0")}`, rng));
  }
  for (let i = 1; i <= 12; i++) {
    store.registerAnimal(makeAgent("chicken", `POLLO #${String(i).padStart(3, "0")}`, rng));
  }
}
