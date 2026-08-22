import { PLOTS, POND, PATHS, PATH_WIDTH, distanceToPaths } from "../../utils/terrainMath";

export const TILE_SIZE = 8;
export type TileKind = "water" | "sand" | "path" | "dirt" | "grass";

export interface TileInfo {
  kind: TileKind;
  variant: number;
  ix: number;
  iz: number;
}

export interface NeighborMask {
  n: boolean;
  ne: boolean;
  e: boolean;
  se: boolean;
  s: boolean;
  sw: boolean;
  w: boolean;
  nw: boolean;
}

export interface PathTileInfo {
  isPath: boolean;
  direction: number;
  isEnd: boolean;
  isIntersection: boolean;
  neighborCount: number;
}

function tileHash(ix: number, iz: number): number {
  let h = (ix | 0) * 374761393 + (iz | 0) * 668265263;
  h = ((h ^ (h >> 13)) * 1274126177) | 0;
  return ((h ^ (h >> 16)) & 0x7fffffff) / 0x7fffffff;
}

function classify(wx: number, wz: number): TileKind {
  const pd = Math.hypot(wx - POND.x, wz - POND.z);
  if (pd < POND.radius - 0.5) return "water";
  if (pd < POND.radius + 3.0) return "sand";
  if (distanceToPaths(wx, wz) < PATH_WIDTH * 0.75) return "path";
  for (const p of PLOTS) {
    if (Math.abs(wx - p.cx) < p.w / 2 + 1.5 && Math.abs(wz - p.cz) < p.d / 2 + 1.5) return "dirt";
  }
  return "grass";
}

const GRASS_VARIANT_COUNT = 6;
const DIRT_VARIANT_COUNT = 4;
const PATH_VARIANT_COUNT = 3;
const SAND_VARIANT_COUNT = 2;

function variantCount(kind: TileKind): number {
  switch (kind) {
    case "grass": return GRASS_VARIANT_COUNT;
    case "dirt": return DIRT_VARIANT_COUNT;
    case "path": return PATH_VARIANT_COUNT;
    case "sand": return SAND_VARIANT_COUNT;
    default: return 1;
  }
}

export function getTile(ix: number, iz: number): TileInfo {
  const wx = ix * TILE_SIZE;
  const wz = iz * TILE_SIZE;
  const kind = classify(wx + TILE_SIZE / 2, wz + TILE_SIZE / 2);
  const h = tileHash(ix, iz);
  const variant = Math.floor(h * variantCount(kind));
  return { kind, variant, ix, iz };
}

export function getNeighbors(ix: number, iz: number): NeighborMask {
  return {
    n:  classify(ix * TILE_SIZE + TILE_SIZE / 2, (iz - 1) * TILE_SIZE + TILE_SIZE / 2) !== "grass",
    ne: classify((ix + 1) * TILE_SIZE + TILE_SIZE / 2, (iz - 1) * TILE_SIZE + TILE_SIZE / 2) !== "grass",
    e:  classify((ix + 1) * TILE_SIZE + TILE_SIZE / 2, iz * TILE_SIZE + TILE_SIZE / 2) !== "grass",
    se: classify((ix + 1) * TILE_SIZE + TILE_SIZE / 2, (iz + 1) * TILE_SIZE + TILE_SIZE / 2) !== "grass",
    s:  classify(ix * TILE_SIZE + TILE_SIZE / 2, (iz + 1) * TILE_SIZE + TILE_SIZE / 2) !== "grass",
    sw: classify((ix - 1) * TILE_SIZE + TILE_SIZE / 2, (iz + 1) * TILE_SIZE + TILE_SIZE / 2) !== "grass",
    w:  classify((ix - 1) * TILE_SIZE + TILE_SIZE / 2, iz * TILE_SIZE + TILE_SIZE / 2) !== "grass",
    nw: classify((ix - 1) * TILE_SIZE + TILE_SIZE / 2, (iz - 1) * TILE_SIZE + TILE_SIZE / 2) !== "grass",
  };
}

export function countNonGrassNeighbors(n: NeighborMask): number {
  let c = 0;
  if (n.n) c++;
  if (n.ne) c++;
  if (n.e) c++;
  if (n.se) c++;
  if (n.s) c++;
  if (n.sw) c++;
  if (n.w) c++;
  if (n.nw) c++;
  return c;
}

export function getPathTileInfo(ix: number, iz: number): PathTileInfo {
  const wx = ix * TILE_SIZE + TILE_SIZE / 2;
  const wz = iz * TILE_SIZE + TILE_SIZE / 2;
  const isPath = classify(wx, wz) === "path";
  if (!isPath) return { isPath: false, direction: 0, isEnd: false, isIntersection: false, neighborCount: 0 };

  const step = TILE_SIZE * 0.8;
  const nDir = classify(wx, wz - step) === "path";
  const sDir = classify(wx, wz + step) === "path";
  const eDir = classify(wx + step, wz) === "path";
  const wDir = classify(wx - step, wz) === "path";

  const neighbors = (nDir ? 1 : 0) + (sDir ? 1 : 0) + (eDir ? 1 : 0) + (wDir ? 1 : 0);

  let direction = 0;
  if (nDir && !sDir) direction = 0;
  else if (sDir && !nDir) direction = Math.PI;
  else if (eDir && !wDir) direction = Math.PI / 2;
  else if (wDir && !eDir) direction = -Math.PI / 2;
  else if (nDir && eDir) direction = Math.PI / 4;
  else if (eDir && sDir) direction = (3 * Math.PI) / 4;
  else if (sDir && wDir) direction = -(3 * Math.PI) / 4;
  else if (wDir && nDir) direction = -Math.PI / 4;

  return {
    isPath: true,
    direction,
    isEnd: neighbors === 1,
    isIntersection: neighbors >= 3,
    neighborCount: neighbors,
  };
}

export interface EdgeResult {
  blendN: number;
  blendS: number;
  blendE: number;
  blendW: number;
}

export function getEdgeBlends(ix: number, iz: number): EdgeResult {
  const thisKind = classify(ix * TILE_SIZE + TILE_SIZE / 2, iz * TILE_SIZE + TILE_SIZE / 2);

  const nKind = classify(ix * TILE_SIZE + TILE_SIZE / 2, (iz - 1) * TILE_SIZE + TILE_SIZE / 2);
  const sKind = classify(ix * TILE_SIZE + TILE_SIZE / 2, (iz + 1) * TILE_SIZE + TILE_SIZE / 2);
  const eKind = classify((ix + 1) * TILE_SIZE + TILE_SIZE / 2, iz * TILE_SIZE + TILE_SIZE / 2);
  const wKind = classify((ix - 1) * TILE_SIZE + TILE_SIZE / 2, iz * TILE_SIZE + TILE_SIZE / 2);

  return {
    blendN: thisKind !== nKind && nKind !== "water" ? 0.5 : 0,
    blendS: thisKind !== sKind && sKind !== "water" ? 0.5 : 0,
    blendE: thisKind !== eKind && eKind !== "water" ? 0.5 : 0,
    blendW: thisKind !== wKind && wKind !== "water" ? 0.5 : 0,
  };
}

export function isInPlot(wx: number, wz: number): number {
  for (let i = 0; i < PLOTS.length; i++) {
    const p = PLOTS[i];
    if (Math.abs(wx - p.cx) < p.w / 2 && Math.abs(wz - p.cz) < p.d / 2) return i;
  }
  return -1;
}