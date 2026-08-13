import type { AnimalKind } from "../types";

export interface Bounds {
  minX: number;
  maxX: number;
  minZ: number;
  maxZ: number;
}

export interface EnclosureDef {
  id: string;
  name: string;
  icon: string;
  kind: AnimalKind;
  bounds: Bounds;
  capacity: number;
  /** Posición de la puerta: arista del rectángulo y fracción (0..1) a lo largo de ella. */
  gate: { edge: "minX" | "maxX" | "minZ" | "maxZ"; t: number };
}

export const ENCLOSURES: EnclosureDef[] = [
  {
    id: "cow-pen",
    name: "Corral de vacas",
    icon: "🐄",
    kind: "cow",
    bounds: { minX: 30, maxX: 64, minZ: 22, maxZ: 50 },
    capacity: 12,
    gate: { edge: "minZ", t: 0.5 },
  },
  {
    id: "chicken-pen",
    name: "Corral de pollos",
    icon: "🐔",
    kind: "chicken",
    bounds: { minX: 11, maxX: 29, minZ: -44, maxZ: -28 },
    capacity: 24,
    gate: { edge: "minZ", t: 0.4 },
  },
];

export const ENCLOSURE_BY_KIND: Record<AnimalKind, EnclosureDef> = {
  cow: ENCLOSURES[0],
  chicken: ENCLOSURES[1],
};

export function insideEnclosure(x: number, z: number): EnclosureDef | null {
  for (const e of ENCLOSURES) {
    if (x >= e.bounds.minX && x <= e.bounds.maxX && z >= e.bounds.minZ && z <= e.bounds.maxZ) return e;
  }
  return null;
}

export function insideAnyEnclosure(x: number, z: number, margin = 0): boolean {
  return ENCLOSURES.some(
    (e) =>
      x >= e.bounds.minX - margin &&
      x <= e.bounds.maxX + margin &&
      z >= e.bounds.minZ - margin &&
      z <= e.bounds.maxZ + margin
  );
}

export interface FenceSeg {
  x: number;
  z: number;
  rot: number;
}

const FENCE_SPACING = 6;
const GATE_GAP = 4;

function gateAxis(def: EnclosureDef): "x" | "z" {
  return def.gate.edge === "minX" || def.gate.edge === "maxX" ? "z" : "x";
}

function onGate(def: EnclosureDef, edge: EnclosureDef["gate"]["edge"], coord: number): boolean {
  if (def.gate.edge !== edge) return false;
  const axis = gateAxis(def);
  const lo = axis === "x" ? def.bounds.minX : def.bounds.minZ;
  const hi = axis === "x" ? def.bounds.maxX : def.bounds.maxZ;
  const center = lo + def.gate.t * (hi - lo);
  return Math.abs(coord - center) < GATE_GAP;
}

/** Genera los segmentos de cerca del perímetro del corral, dejando hueco para la puerta. */
export function getEnclosureFences(def: EnclosureDef): FenceSeg[] {
  const b = def.bounds;
  const segs: FenceSeg[] = [];
  const step = FENCE_SPACING;

  for (let x = b.minX + step / 2; x < b.maxX - step / 2; x += step) {
    if (!onGate(def, "minZ", x)) segs.push({ x, z: b.minZ, rot: 0 });
    if (!onGate(def, "maxZ", x)) segs.push({ x, z: b.maxZ, rot: 0 });
  }
  for (let z = b.minZ + step / 2; z < b.maxZ - step / 2; z += step) {
    if (!onGate(def, "minX", z)) segs.push({ x: b.minX, z, rot: Math.PI / 2 });
    if (!onGate(def, "maxX", z)) segs.push({ x: b.maxX, z, rot: Math.PI / 2 });
  }
  return segs;
}

export function getGatePositions(def: EnclosureDef): Array<{ x: number; z: number; rot: number }> {
  const axis = gateAxis(def);
  const lo = axis === "x" ? def.bounds.minX : def.bounds.minZ;
  const hi = axis === "x" ? def.bounds.maxX : def.bounds.maxZ;
  const c = lo + def.gate.t * (hi - lo);
  const b = def.bounds;
  const rot = def.gate.edge === "minX" || def.gate.edge === "maxX" ? Math.PI / 2 : 0;
  const x = def.gate.edge === "minX" ? b.minX : def.gate.edge === "maxX" ? b.maxX : c;
  const z = def.gate.edge === "minZ" ? b.minZ : def.gate.edge === "maxZ" ? b.maxZ : c;
  return [{ x, z, rot }];
}
