import type { AnimalAgent, AnimalKind } from "../../types";
import { useFarmStore } from "../../store/farmStore";
import { terrainHeight } from "../../utils/terrain";
import { makeRng } from "../../utils/math";
import { ENCLOSURE_BY_KIND } from "../../config/enclosures";

let idCounter = 1;

/** Crea un agente de animal listo para registrarse en la granja. */
export function createAnimalAgent(kind: AnimalKind, name: string, rng?: () => number): AnimalAgent {
  const rand = rng ?? Math.random;
  const enc = ENCLOSURE_BY_KIND[kind];
  const b = enc.bounds;
  const margin = 2;
  const x = b.minX + margin + rand() * (b.maxX - b.minX - margin * 2);
  const z = b.minZ + margin + rand() * (b.maxZ - b.minZ - margin * 2);
  const now = Date.now() / 1000;
  const scale =
    kind === "cow" ? 0.95 + rand() * 0.2 : kind === "pig" ? 0.85 + rand() * 0.2 : 0.9 + rand() * 0.3;
  return {
    id: idCounter++,
    kind,
    name,
    position: [x, terrainHeight(x, z), z],
    rotation: rand() * Math.PI * 2,
    velocity: [0, 0, 0],
    state: "rest",
    target: [x, 0, z],
    bounds: b,
    actionTimer: rand() * 3,
    mood: 0.8 + rand() * 0.2,
    health: 100,
    scale,
    walkPhase: rand() * Math.PI * 2,
    idlePhase: rand() * Math.PI * 2,
    speed: 1,
    pendingProduction: 0,
    nextHarvestAt: now + (kind === "cow" ? 20 : kind === "pig" ? 18 : 15),
  };
}

export function spawnInitialAnimals(): void {
  const rng = makeRng(987654321);
  const store = useFarmStore.getState();

  for (let i = 1; i <= 8; i++) {
    store.registerAnimal(createAnimalAgent("cow", `VACA #${String(i).padStart(3, "0")}`, rng));
  }
  for (let i = 1; i <= 12; i++) {
    store.registerAnimal(createAnimalAgent("chicken", `POLLO #${String(i).padStart(3, "0")}`, rng));
  }
}
