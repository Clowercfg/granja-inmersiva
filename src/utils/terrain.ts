import * as THREE from "three";
import { WORLD } from "../config/world";
import { smoothstep } from "./math";
import {
  POND,
  WATER_Y,
  PLOTS,
  PATHS,
  PATH_WIDTH,
  terrainHeight as _terrainHeight,
  terrainNormal as _terrainNormal,
  distanceToPaths as _distanceToPaths,
  pointInRect,
  type PlotRect,
  type PathPoint,
  type Vec3,
} from "./terrainMath";

export { POND, WATER_Y, PLOTS, PATHS, PATH_WIDTH };
export type { PlotRect, PathPoint, Vec3 };

export function terrainHeight(x: number, z: number): number {
  return _terrainHeight(x, z);
}

export function terrainNormal(x: number, z: number, eps = 0.8): THREE.Vector3 {
  const n = _terrainNormal(x, z, eps);
  return new THREE.Vector3(n.x, n.y, n.z);
}

export function isInsideFarm(x: number, z: number, radius = WORLD.farmRadius): boolean {
  return Math.hypot(x, z) <= radius;
}

export function distanceToPaths(x: number, z: number): number {
  return _distanceToPaths(x, z);
}

export function plotAt(x: number, z: number): PlotRect | null {
  for (const p of PLOTS) {
    if (Math.abs(x - p.cx) < p.w / 2 && Math.abs(z - p.cz) < p.d / 2) return p;
  }
  return null;
}

export function heightArray(res = 256): Float32Array {
  const data = new Float32Array(res * res);
  for (let j = 0; j < res; j++) {
    for (let i = 0; i < res; i++) {
      const u = i / (res - 1);
      const v = j / (res - 1);
      const x = -WORLD.half + u * WORLD.size;
      const z = -WORLD.half + v * WORLD.size;
      data[j * res + i] = _terrainHeight(x, z);
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
      data[j * res + i] = _terrainHeight(x, z);
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

export function bakeMaskTexture(res = 512): THREE.DataTexture {
  const data = new Uint8Array(res * res * 4);
  for (let j = 0; j < res; j++) {
    for (let i = 0; i < res; i++) {
      const u = i / (res - 1);
      const v = j / (res - 1);
      const x = -WORLD.half + u * WORLD.size;
      const z = -WORLD.half + v * WORLD.size;

      const pathDist = _distanceToPaths(x, z);
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

      const h = _terrainHeight(x, z);
      const n = _terrainNormal(x, z, 1.2);
      const slope = 1 - Math.min(1, Math.max(0, n.y));

      const pathM = 1 - smoothstep(PATH_WIDTH - 1.2, PATH_WIDTH + 1.2, _distanceToPaths(x, z));
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
      const n = _terrainNormal(x, z, 1.5);
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
