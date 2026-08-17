/**
 * Standalone terrain math – port of src/utils/terrain.ts, noise.ts, math.ts.
 * Imports WORLD from config/world.ts and ENCLOSURES from config/enclosures.ts
 * (neither imports THREE). Safe for Babylon.js consumption.
 */

import { WORLD } from "../../../config/world";
import { ENCLOSURES } from "../../../config/enclosures";
import { OBSTACLES as _OBSTACLES } from "../../../config/layout";

export { WORLD, ENCLOSURES };

/* ═══════════════════════════════════════════════════════════════════════════
 *  PRIMITIVE MATH HELPERS
 * ═══════════════════════════════════════════════════════════════════════════ */

export function clamp(v: number, min: number, max: number): number {
  return v < min ? min : v > max ? max : v;
}

export function smoothstep(a: number, b: number, x: number): number {
  const t = clamp((x - a) / (b - a), 0, 1);
  return t * t * (3 - 2 * t);
}

export function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

/* ═══════════════════════════════════════════════════════════════════════════
 *  SIMPLEX NOISE  (exact port of src/utils/noise.ts)
 * ═══════════════════════════════════════════════════════════════════════════ */

const F2 = 0.5 * (Math.sqrt(3) - 1);
const G2 = (3 - Math.sqrt(3)) / 6;

const GRAD3: readonly (readonly [number, number])[] = [
  [1, 1], [-1, 1], [1, -1], [-1, -1],
  [1, 0], [-1, 0], [0, 1], [0, -1],
];

const PERM = new Uint8Array(512);
{
  const p = new Uint8Array(256);
  for (let i = 0; i < 256; i++) p[i] = i;
  let seed = 1337;
  const rng = () => {
    seed = (seed * 16807) % 2147483647;
    return seed / 2147483647;
  };
  for (let i = 255; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    const t = p[i];
    p[i] = p[j];
    p[j] = t;
  }
  for (let i = 0; i < 512; i++) PERM[i] = p[i & 255];
}

function simplex2(xin: number, yin: number): number {
  let n0 = 0;
  let n1 = 0;
  let n2 = 0;
  const s = (xin + yin) * F2;
  const i = Math.floor(xin + s);
  const j = Math.floor(yin + s);
  const t = (i + j) * G2;
  const x0 = xin - (i - t);
  const y0 = yin - (j - t);
  const i1 = x0 > y0 ? 1 : 0;
  const j1 = x0 > y0 ? 0 : 1;
  const x1 = x0 - i1 + G2;
  const y1 = y0 - j1 + G2;
  const x2 = x0 - 1 + 2 * G2;
  const y2 = y0 - 1 + 2 * G2;
  const ii = i & 255;
  const jj = j & 255;
  const gi0 = PERM[ii + PERM[jj]] % 8;
  const gi1 = PERM[ii + i1 + PERM[jj + j1]] % 8;
  const gi2 = PERM[ii + 1 + PERM[jj + 1]] % 8;
  let t0 = 0.5 - x0 * x0 - y0 * y0;
  if (t0 >= 0) {
    t0 *= t0;
    n0 = t0 * t0 * (GRAD3[gi0][0] * x0 + GRAD3[gi0][1] * y0);
  }
  let t1 = 0.5 - x1 * x1 - y1 * y1;
  if (t1 >= 0) {
    t1 *= t1;
    n1 = t1 * t1 * (GRAD3[gi1][0] * x1 + GRAD3[gi1][1] * y1);
  }
  let t2 = 0.5 - x2 * x2 - y2 * y2;
  if (t2 >= 0) {
    t2 *= t2;
    n2 = t2 * t2 * (GRAD3[gi2][0] * x2 + GRAD3[gi2][1] * y2);
  }
  return 70 * (n0 + n1 + n2);
}

export function fbm(x: number, y: number, octaves = 4, lacunarity = 2, gain = 0.5): number {
  let amp = 1;
  let freq = 1;
  let sum = 0;
  let norm = 0;
  for (let o = 0; o < octaves; o++) {
    sum += amp * simplex2(x * freq, y * freq);
    norm += amp;
    amp *= gain;
    freq *= lacunarity;
  }
  return sum / norm;
}

/* ═══════════════════════════════════════════════════════════════════════════
 *  WORLD CONSTANTS
 * ═══════════════════════════════════════════════════════════════════════════ */

export const POND = { x: 12, z: -24, radius: 11.5, depth: 2.2 } as const;
export const WATER_Y = 1.0;

export interface PlotRect {
  cx: number;
  cz: number;
  w: number;
  d: number;
}

export const PLOTS: PlotRect[] = [
  { cx: -36, cz: 20, w: 21, d: 11 },
  { cx: -34, cz: 6, w: 15, d: 15 },
  { cx: -34, cz: -8, w: 15, d: 13 },
  { cx: -34, cz: -22, w: 15, d: 11 },
];

const FLAT_RECTS: PlotRect[] = [
  ...PLOTS,
  ...ENCLOSURES.map((e) => {
    const b = e.bounds;
    return {
      cx: (b.minX + b.maxX) / 2,
      cz: (b.minZ + b.maxZ) / 2,
      w: b.maxX - b.minX,
      d: b.maxZ - b.minZ,
    };
  }),
];

export interface PathPoint {
  x: number;
  z: number;
}

export const PATHS: PathPoint[][] = [
  [{ x: 0, z: 0 }, { x: -10, z: 14 }, { x: -16, z: 20 }],
  [{ x: 0, z: 0 }, { x: 0, z: 16 }, { x: 2, z: 22 }],
  [{ x: 0, z: 0 }, { x: -10, z: 4 }, { x: -16, z: 4 }],
  [{ x: 0, z: 0 }, { x: 2, z: 4 }],
  [{ x: 0, z: 0 }, { x: -10, z: -4 }, { x: -16, z: -8 }],
  [{ x: 0, z: 0 }, { x: 4, z: -10 }, { x: 6, z: -12 }],
  [{ x: 0, z: 0 }, { x: 12, z: 4 }, { x: 24, z: 12 }, { x: 36, z: 20 }, { x: 49, z: 26 }],
  [{ x: 0, z: 0 }, { x: 30, z: 0 }, { x: 62, z: 0 }, { x: 95, z: 0 }],
];

export const PATH_WIDTH = 2.6;

/* ═══════════════════════════════════════════════════════════════════════════
 *  GEOMETRY HELPERS
 * ═══════════════════════════════════════════════════════════════════════════ */

function pointInRect(x: number, z: number, r: PlotRect, feather: number): number {
  const dx = Math.abs(x - r.cx) - r.w / 2;
  const dz = Math.abs(z - r.cz) - r.d / 2;
  const d = Math.hypot(Math.max(dx, 0), Math.max(dz, 0));
  const inside = Math.max(dx, dz) <= 0;
  return inside ? 1 : 1 - smoothstep(0, feather, d);
}

/* ═══════════════════════════════════════════════════════════════════════════
 *  HEIGHT FUNCTIONS
 * ═══════════════════════════════════════════════════════════════════════════ */

function baseHeight(x: number, z: number): number {
  const r = Math.hypot(x, z);
  const flat = 1 - smoothstep(WORLD.farmRadius, WORLD.farmRadius + 60, r);
  const noise = fbm(x * 0.006 + 13.7, z * 0.006 - 2.3, 4);
  const hills = fbm(x * 0.0016 + 91.2, z * 0.0016 + 7.7, 3);
  const local = 1.9 + noise * 0.5;
  const outside = 1.9 + noise * 3.0 + hills * 9.0;
  let h = lerp(outside, local, flat);
  const edge = smoothstep(WORLD.half - 160, WORLD.half, r);
  h = lerp(h, -2.5, edge);
  return h;
}

export function terrainHeight(x: number, z: number): number {
  let h = baseHeight(x, z);

  let flatMask = 0;
  let flatTarget = h;
  for (const r of FLAT_RECTS) {
    const m = pointInRect(x, z, r, 2.6);
    if (m > flatMask) {
      flatMask = m;
      flatTarget = baseHeight(r.cx, r.cz);
    }
  }
  h = h + (flatTarget - h) * flatMask;

  const pd = Math.hypot(x - POND.x, z - POND.z);
  const carve = 1 - smoothstep(POND.radius - POND.depth, POND.radius, pd);
  h -= POND.depth * carve;
  return h;
}

/** Returns {x,y,z} instead of THREE.Vector3. */
export function terrainNormal(x: number, z: number, eps = 0.8): { x: number; y: number; z: number } {
  const hL = terrainHeight(x - eps, z);
  const hR = terrainHeight(x + eps, z);
  const hD = terrainHeight(x, z - eps);
  const hU = terrainHeight(x, z + eps);
  const dx = (hR - hL) / (2 * eps);
  const dz = (hU - hD) / (2 * eps);
  const len = Math.sqrt(dx * dx + 1 + dz * dz);
  return { x: -dx / len, y: 1 / len, z: -dz / len };
}

/* ═══════════════════════════════════════════════════════════════════════════
 *  PATH / PLOT QUERIES
 * ═══════════════════════════════════════════════════════════════════════════ */

export function distanceToPaths(x: number, z: number): number {
  let best = Infinity;
  for (const chain of PATHS) {
    for (let i = 0; i < chain.length - 1; i++) {
      const a = chain[i];
      const b = chain[i + 1];
      const abx = b.x - a.x;
      const abz = b.z - a.z;
      const t = clamp(((x - a.x) * abx + (z - a.z) * abz) / (abx * abx + abz * abz), 0, 1);
      const px = a.x + abx * t;
      const pz = a.z + abz * t;
      const d = Math.hypot(x - px, z - pz);
      if (d < best) best = d;
    }
  }
  return best;
}

export function plotAt(x: number, z: number): PlotRect | null {
  for (const p of PLOTS) {
    if (Math.abs(x - p.cx) < p.w / 2 && Math.abs(z - p.cz) < p.d / 2) return p;
  }
  return null;
}

export function isInsideFarm(x: number, z: number, radius = WORLD.farmRadius): boolean {
  return Math.hypot(x, z) <= radius;
}

export function insideAnyEnclosure(x: number, z: number, margin = 0): boolean {
  return ENCLOSURES.some(
    (e) =>
      x >= e.bounds.minX - margin &&
      x <= e.bounds.maxX + margin &&
      z >= e.bounds.minZ - margin &&
      z <= e.bounds.maxZ + margin,
  );
}

export type Obstacle = { x: number; z: number; radius: number };

export const OBSTACLES: Obstacle[] = _OBSTACLES;

export function isNearObstacle(x: number, z: number, margin = 0): boolean {
  for (const o of OBSTACLES) {
    if (Math.hypot(x - o.x, z - o.z) < o.radius + margin) return true;
  }
  return false;
}
