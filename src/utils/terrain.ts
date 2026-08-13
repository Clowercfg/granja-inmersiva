import * as THREE from "three";
import { WORLD } from "../config/world";
import { fbm } from "./noise";
import { lerp, smoothstep, clamp } from "./math";

export const POND = { x: -44, z: -32, radius: 11.5, depth: 2.2 };
export const WATER_Y = 1.0;

export interface PlotRect {
  cx: number;
  cz: number;
  w: number;
  d: number;
}

export const PLOTS: PlotRect[] = [
  { cx: -24, cz: 21, w: 21, d: 11 },
  { cx: 23, cz: 3, w: 15, d: 15 },
  { cx: -23, cz: 2, w: 15, d: 13 },
  { cx: 19, cz: 23, w: 15, d: 11 },
];

export interface PathPoint {
  x: number;
  z: number;
}

export const PATHS: PathPoint[][] = [
  [
    { x: 0, z: 0 },
    { x: 8, z: 6 },
    { x: 20, z: 10 },
  ],
  [
    { x: 0, z: 0 },
    { x: 12, z: -8 },
    { x: 22, z: -15 },
  ],
  [
    { x: 0, z: 0 },
    { x: -6, z: 4 },
    { x: -13, z: 11 },
  ],
  [
    { x: 0, z: 0 },
    { x: -10, z: -8 },
    { x: -19, z: -17 },
  ],
  [
    { x: 0, z: 0 },
    { x: -18, z: -20 },
    { x: -34, z: -28 },
    { x: -44, z: -32 },
  ],
  [
    { x: 0, z: 0 },
    { x: 30, z: 0 },
    { x: 62, z: 0 },
    { x: 95, z: 0 },
  ],
  [
    { x: 0, z: 0 },
    { x: 0, z: -30 },
    { x: 0, z: -72 },
  ],
];

export const PATH_WIDTH = 2.6;

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
  const pd = Math.hypot(x - POND.x, z - POND.z);
  const carve = 1 - smoothstep(POND.radius - POND.depth, POND.radius, pd);
  h -= POND.depth * carve;
  return h;
}

export function terrainNormal(x: number, z: number, eps = 0.8): THREE.Vector3 {
  const hL = terrainHeight(x - eps, z);
  const hR = terrainHeight(x + eps, z);
  const hD = terrainHeight(x, z - eps);
  const hU = terrainHeight(x, z + eps);
  const dx = (hR - hL) / (2 * eps);
  const dz = (hU - hD) / (2 * eps);
  return new THREE.Vector3(-dx, 1, -dz).normalize();
}

export function isInsideFarm(x: number, z: number, radius = WORLD.farmRadius): boolean {
  return Math.hypot(x, z) <= radius;
}

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

function pointInRect(x: number, z: number, r: PlotRect, feather: number): number {
  const dx = Math.abs(x - r.cx) - r.w / 2;
  const dz = Math.abs(z - r.cz) - r.d / 2;
  const d = Math.hypot(Math.max(dx, 0), Math.max(dz, 0));
  const inside = Math.max(dx, dz) <= 0;
  return inside ? 1 : 1 - smoothstep(0, feather, d);
}

export function heightArray(res = 256): Float32Array {
  const data = new Float32Array(res * res);
  for (let j = 0; j < res; j++) {
    for (let i = 0; i < res; i++) {
      const u = i / (res - 1);
      const v = j / (res - 1);
      const x = -WORLD.half + u * WORLD.size;
      const z = -WORLD.half + v * WORLD.size;
      data[j * res + i] = terrainHeight(x, z);
    }
  }
  return data;
}

export function bakeHeightTexture(res = 512): THREE.DataTexture {
  const data = new Float32Array(res * res);
  for (let j = 0; j < res; j++) {
    for (let i = 0; i < res; i++) {
      const u = i / (res - 1);
      const v = j / (res - 1);
      const x = -WORLD.half + u * WORLD.size;
      const z = -WORLD.half + v * WORLD.size;
      data[j * res + i] = terrainHeight(x, z);
    }
  }
  const tex = new THREE.DataTexture(data, res, res, THREE.RedFormat, THREE.HalfFloatType);
  tex.wrapS = THREE.ClampToEdgeWrapping;
  tex.wrapT = THREE.ClampToEdgeWrapping;
  tex.minFilter = THREE.LinearFilter;
  tex.magFilter = THREE.LinearFilter;
  tex.needsUpdate = true;
  return tex;
}

export function bakeMaskTexture(res = 512): THREE.DataTexture {  const data = new Uint8Array(res * res * 4);
  for (let j = 0; j < res; j++) {
    for (let i = 0; i < res; i++) {
      const u = i / (res - 1);
      const v = j / (res - 1);
      const x = -WORLD.half + u * WORLD.size;
      const z = -WORLD.half + v * WORLD.size;

      const pathDist = distanceToPaths(x, z);
      const pathM = 1 - smoothstep(PATH_WIDTH - 1.2, PATH_WIDTH + 1.2, pathDist);

      let plotM = 0;
      for (const p of PLOTS) {
        const pm = pointInRect(x, z, p, 1.6);
        if (pm > plotM) plotM = pm;
      }

      const pd = Math.hypot(x - POND.x, z - POND.z);
      const sandM = smoothstep(POND.radius - 3, POND.radius + 1.5, pd) * (1 - smoothstep(POND.radius + 6, POND.radius + 10, pd));

      const idx = (j * res + i) * 4;
      data[idx] = Math.round(pathM * 255);
      data[idx + 1] = Math.round(plotM * 255);
      data[idx + 2] = Math.round(sandM * 255);
      data[idx + 3] = 255;
    }
  }
  const tex = new THREE.DataTexture(data, res, res, THREE.RGBAFormat, THREE.UnsignedByteType);
  tex.wrapS = THREE.ClampToEdgeWrapping;
  tex.wrapT = THREE.ClampToEdgeWrapping;
  tex.minFilter = THREE.LinearFilter;
  tex.magFilter = THREE.LinearFilter;
  tex.needsUpdate = true;
  return tex;
}

const C_GRASS_A = new THREE.Color("#4d7c33");
const C_GRASS_B = new THREE.Color("#6a9a42");
const C_GRASS_C = new THREE.Color("#3c662a");
const C_DIRT = new THREE.Color("#7a5a38");
const C_PATH = new THREE.Color("#8d6f48");
const C_SAND = new THREE.Color("#c3a464");
const C_ROCK = new THREE.Color("#7c8074");
const C_PLOT = new THREE.Color("#5e442e");

function hashColor(ix: number, iy: number, seed: number): number {
  let h = seed ^ (ix * 374761393) ^ (iy * 668265263);
  h = (h ^ (h >>> 13)) * 1274126177;
  h ^= h >>> 16;
  return (h >>> 0) / 4294967296;
}

export function bakeColorTexture(res = 1024): THREE.DataTexture {
  const data = new Uint8Array(res * res * 4);
  for (let j = 0; j < res; j++) {
    for (let i = 0; i < res; i++) {
      const u = i / (res - 1);
      const v = j / (res - 1);
      const x = -WORLD.half + u * WORLD.size;
      const z = -WORLD.half + v * WORLD.size;

      const h = terrainHeight(x, z);
      const n = terrainNormal(x, z, 1.2);
      const slope = 1 - Math.min(1, Math.max(0, n.y));

      const pathM = 1 - smoothstep(PATH_WIDTH - 1.2, PATH_WIDTH + 1.2, distanceToPaths(x, z));
      let plotM = 0;
      for (const p of PLOTS) {
        const pm = pointInRect(x, z, p, 1.6);
        if (pm > plotM) plotM = pm;
      }
      const pd = Math.hypot(x - POND.x, z - POND.z);
      const sandM = smoothstep(POND.radius - 3, POND.radius + 1.5, pd) * (1 - smoothstep(POND.radius + 6, POND.radius + 10, pd));

      const rnd = hashColor(i, j, 7);
      const rnd2 = hashColor(i, j, 13);

      const grass = rnd < 0.55 ? C_GRASS_A : rnd < 0.85 ? C_GRASS_B : C_GRASS_C;
      const c = new THREE.Color(grass);
      if (plotM > 0.01) c.lerp(C_PLOT, plotM * 0.92);
      if (pathM > 0.01) c.lerp(C_PATH, pathM * 0.94);
      if (sandM > 0.01) c.lerp(C_SAND, sandM);
      if (slope > 0.32) c.lerp(C_ROCK, smoothstep(0.32, 0.6, slope) * 0.9);
      if (h < -0.4) c.lerp(C_DIRT, Math.min(1, (-0.4 - h) * 0.5));

      c.multiplyScalar(0.92 + rnd2 * 0.14);
      if (slope < 0.15) c.multiplyScalar(0.97);

      const idx = (j * res + i) * 4;
      data[idx] = Math.round(c.r * 255);
      data[idx + 1] = Math.round(c.g * 255);
      data[idx + 2] = Math.round(c.b * 255);
      data[idx + 3] = 255;
    }
  }
  const tex = new THREE.DataTexture(data, res, res, THREE.RGBAFormat, THREE.UnsignedByteType);
  tex.wrapS = THREE.ClampToEdgeWrapping;
  tex.wrapT = THREE.ClampToEdgeWrapping;
  tex.minFilter = THREE.LinearFilter;
  tex.magFilter = THREE.LinearFilter;
  tex.generateMipmaps = true;
  tex.needsUpdate = true;
  return tex;
}

export function bakeNormalTexture(res = 256): THREE.DataTexture {
  const data = new Uint8Array(res * res * 4);
  for (let j = 0; j < res; j++) {
    for (let i = 0; i < res; i++) {
      const u = i / (res - 1);
      const v = j / (res - 1);
      const x = -WORLD.half + u * WORLD.size;
      const z = -WORLD.half + v * WORLD.size;
      const n = terrainNormal(x, z, 1.5);
      const idx = (j * res + i) * 4;
      data[idx] = Math.round((n.x * 0.5 + 0.5) * 255);
      data[idx + 1] = Math.round((n.y * 0.5 + 0.5) * 255);
      data[idx + 2] = Math.round((n.z * 0.5 + 0.5) * 255);
      data[idx + 3] = 255;
    }
  }
  const tex = new THREE.DataTexture(data, res, res, THREE.RGBAFormat, THREE.UnsignedByteType);
  tex.wrapS = THREE.ClampToEdgeWrapping;
  tex.wrapT = THREE.ClampToEdgeWrapping;
  tex.minFilter = THREE.LinearFilter;
  tex.magFilter = THREE.LinearFilter;
  tex.generateMipmaps = true;
  tex.needsUpdate = true;
  return tex;
}
