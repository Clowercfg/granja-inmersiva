import type { CameraState } from "./Camera2D";
import { worldToScreen } from "./Camera2D";
import { PLOTS, POND, PATH_WIDTH, distanceToPaths } from "../../utils/terrainMath";
import { ENCLOSURES } from "../../config/enclosures";
import { TILE_SIZE, type TileKind, type TileInfo, type NeighborMask, type EdgeResult, type PathTileInfo, getTile, getNeighbors, getEdgeBlends, getPathTileInfo } from "./TileSystem";

const COS30 = 0.866025;
const SIN30 = 0.5;

export interface TerrainStats {
  tilesDrawn: number;
  tilesVisible: number;
  tilesTotal: number;
}

interface ColorRGB { r: number; g: number; b: number; }

function rgb(c: ColorRGB): string { return `rgb(${c.r | 0},${c.g | 0},${c.b | 0})`; }
function rgba(c: ColorRGB, a: number): string { return `rgba(${c.r | 0},${c.g | 0},${c.b | 0},${a})`; }
function mix(a: ColorRGB, b: ColorRGB, t: number): ColorRGB {
  return { r: a.r + (b.r - a.r) * t, g: a.g + (b.g - a.g) * t, b: a.b + (b.b - a.b) * t };
}
function brighten(c: ColorRGB, f: number): ColorRGB {
  return { r: Math.min(255, c.r * f), g: Math.min(255, c.g * f), b: Math.min(255, c.b * f) };
}

const GRASS_BASE: ColorRGB = { r: 82, g: 130, b: 55 };
const GRASS_VARIANTS: ColorRGB[] = [
  { r: 76, g: 122, b: 48 }, { r: 88, g: 138, b: 60 },
  { r: 72, g: 118, b: 45 }, { r: 85, g: 134, b: 56 },
  { r: 78, g: 126, b: 50 }, { r: 90, g: 140, b: 62 },
];
const DIRT_BASE: ColorRGB = { r: 120, g: 88, b: 55 };
const DIRT_VARIANTS: ColorRGB[] = [
  { r: 112, g: 82, b: 50 }, { r: 128, g: 95, b: 60 },
  { r: 105, g: 78, b: 48 }, { r: 115, g: 85, b: 52 },
];
const PATH_BASE: ColorRGB = { r: 178, g: 148, b: 105 };
const PATH_VARIANTS: ColorRGB[] = [
  { r: 170, g: 140, b: 98 }, { r: 185, g: 155, b: 112 },
  { r: 172, g: 142, b: 100 },
];
const SAND_BASE: ColorRGB = { r: 210, g: 185, b: 130 };
const SAND_VARIANTS: ColorRGB[] = [
  { r: 200, g: 175, b: 122 }, { r: 218, g: 192, b: 138 },
];
const WATER_SHALLOW: ColorRGB = { r: 75, g: 155, b: 195 };
const WATER_DEEP: ColorRGB = { r: 40, g: 100, b: 165 };
const WATER_SURFACE: ColorRGB = { r: 100, g: 180, b: 220 };
const SAND_WATER: ColorRGB = { r: 195, g: 168, b: 115 };

function getBaseColor(kind: TileKind, variant: number, timeBright: number): ColorRGB {
  let c: ColorRGB;
  switch (kind) {
    case "grass": c = mix(GRASS_BASE, GRASS_VARIANTS[variant % GRASS_VARIANTS.length], 0.5); break;
    case "dirt": c = mix(DIRT_BASE, DIRT_VARIANTS[variant % DIRT_VARIANTS.length], 0.5); break;
    case "path": c = mix(PATH_BASE, PATH_VARIANTS[variant % PATH_VARIANTS.length], 0.5); break;
    case "sand": c = mix(SAND_BASE, SAND_VARIANTS[variant % SAND_VARIANTS.length], 0.5); break;
    default: c = { r: 50, g: 120, b: 180 }; break;
  }
  return brighten(c, timeBright);
}

function drawIsoDiamond(ctx: CanvasRenderingContext2D, sx: number, sy: number, hw: number, hh: number): void {
  ctx.beginPath();
  ctx.moveTo(sx, sy - hh);
  ctx.lineTo(sx + hw, sy);
  ctx.lineTo(sx, sy + hh);
  ctx.lineTo(sx - hw, sy);
  ctx.closePath();
}

function drawTileDetail(
  ctx: CanvasRenderingContext2D,
  sx: number, sy: number,
  hw: number, hh: number,
  tile: TileInfo,
  timeBright: number
): void {
  const base = getBaseColor(tile.kind, tile.variant, timeBright);
  const h = tileHash2D(tile.ix, tile.iz);

  drawIsoDiamond(ctx, sx, sy, hw, hh);
  ctx.fillStyle = rgb(base);
  ctx.fill();

  if (tile.kind === "grass" && h > 0.65) {
    const detailCount = 2 + Math.floor(h * 3);
    ctx.fillStyle = rgba(brighten(base, 1.15), 0.6);
    for (let i = 0; i < detailCount; i++) {
      const dx = (tileHash2D(tile.ix * 7 + i, tile.iz * 3) - 0.5) * hw * 1.2;
      const dy = (tileHash2D(tile.ix * 5, tile.iz * 11 + i) - 0.5) * hh * 0.8;
      ctx.fillRect(sx + dx - 0.5, sy + dy - 2, 1, 3);
    }
  }

  if (tile.kind === "dirt" && h > 0.7) {
    ctx.fillStyle = rgba(brighten(base, 0.85), 0.4);
    const cx = sx + (tileHash2D(tile.ix * 13, tile.iz * 7) - 0.5) * hw * 0.8;
    const cy = sy + (tileHash2D(tile.ix * 9, tile.iz * 5) - 0.5) * hh * 0.6;
    ctx.beginPath();
    ctx.arc(cx, cy, Math.max(1, hw * 0.08), 0, Math.PI * 2);
    ctx.fill();
  }
}

function drawEdgeBlend(
  ctx: CanvasRenderingContext2D,
  sx: number, sy: number,
  hw: number, hh: number,
  edges: EdgeResult
): void {
  if (!edges.blendN && !edges.blendS && !edges.blendE && !edges.blendW) return;

  ctx.save();
  drawIsoDiamond(ctx, sx, sy, hw, hh);
  ctx.clip();

  const edgeColor: ColorRGB = { r: 95, g: 140, b: 65 };

  if (edges.blendN) {
    const grad = ctx.createLinearGradient(sx, sy - hh, sx, sy - hh + hh * 0.6);
    grad.addColorStop(0, rgba(edgeColor, 0.4));
    grad.addColorStop(1, rgba(edgeColor, 0));
    ctx.fillStyle = grad;
    ctx.fillRect(sx - hw, sy - hh, hw * 2, hh * 0.6);
  }
  if (edges.blendS) {
    const grad = ctx.createLinearGradient(sx, sy + hh, sx, sy + hh - hh * 0.6);
    grad.addColorStop(0, rgba(edgeColor, 0.4));
    grad.addColorStop(1, rgba(edgeColor, 0));
    ctx.fillStyle = grad;
    ctx.fillRect(sx - hw, sy + hh - hh * 0.6, hw * 2, hh * 0.6);
  }
  if (edges.blendW) {
    const grad = ctx.createLinearGradient(sx - hw, sy, sx - hw + hw * 0.6, sy);
    grad.addColorStop(0, rgba(edgeColor, 0.4));
    grad.addColorStop(1, rgba(edgeColor, 0));
    ctx.fillStyle = grad;
    ctx.fillRect(sx - hw, sy - hh, hw * 0.6, hh * 2);
  }
  if (edges.blendE) {
    const grad = ctx.createLinearGradient(sx + hw, sy, sx + hw - hw * 0.6, sy);
    grad.addColorStop(0, rgba(edgeColor, 0.4));
    grad.addColorStop(1, rgba(edgeColor, 0));
    ctx.fillStyle = grad;
    ctx.fillRect(sx + hw - hw * 0.6, sy - hh, hw * 0.6, hh * 2);
  }

  ctx.restore();
}

function drawPathTile(
  ctx: CanvasRenderingContext2D,
  sx: number, sy: number,
  hw: number, hh: number,
  pathInfo: PathTileInfo,
  variant: number,
  timeBright: number
): void {
  const base = brighten(PATH_VARIANTS[variant % PATH_VARIANTS.length], timeBright);
  const edgeDark = brighten(base, 0.82);

  drawIsoDiamond(ctx, sx, sy, hw, hh);
  ctx.fillStyle = rgb(base);
  ctx.fill();

  ctx.save();
  drawIsoDiamond(ctx, sx, sy, hw, hh);
  ctx.clip();

  if (pathInfo.isEnd) {
    ctx.beginPath();
    ctx.arc(sx, sy, Math.min(hw, hh) * 0.3, 0, Math.PI * 2);
    ctx.fillStyle = rgba(edgeDark, 0.3);
    ctx.fill();
  }

  if (!pathInfo.isIntersection && pathInfo.neighborCount >= 2) {
    ctx.strokeStyle = rgba(edgeDark, 0.2);
    ctx.lineWidth = Math.max(1, hw * 0.06);
    const cos = Math.cos(pathInfo.direction);
    const sin = Math.sin(pathInfo.direction);
    ctx.beginPath();
    ctx.moveTo(sx + cos * hw, sy + sin * hh);
    ctx.lineTo(sx - cos * hw, sy - sin * hh);
    ctx.stroke();
  }

  ctx.restore();
}
function tileHash2D(ix: number, iz: number): number {
  let h = (ix | 0) * 374761393 + (iz | 0) * 668265263;
  h = ((h ^ (h >> 13)) * 1274126177) | 0;
  return ((h ^ (h >> 16)) & 0x7fffffff) / 0x7fffffff;
}

function drawSandRing(
  ctx: CanvasRenderingContext2D,
  cam: CameraState,
  w: number, h: number,
  waterTime: number
): void {
  const ringSegments = 48;
  const sandInner = POND.radius;
  const sandOuter = POND.radius + 3.0;
  const dayBright = 0.92;

  for (let i = 0; i < ringSegments; i++) {
    const a0 = (i / ringSegments) * Math.PI * 2;
    const a1 = ((i + 1) / ringSegments) * Math.PI * 2;
    const aMid = (a0 + a1) / 2;

    const distVar = 1 + Math.sin(aMid * 3 + waterTime * 0.3) * 0.08;
    const ri = sandInner * distVar;
    const ro = sandOuter * (1 + Math.sin(aMid * 2.5) * 0.1);

    const [ix0, iy0] = worldToScreen(POND.x + Math.cos(a0) * ri, POND.z + Math.sin(a0) * ri, cam, w, h);
    const [ox0, oy0] = worldToScreen(POND.x + Math.cos(a0) * ro, POND.z + Math.sin(a0) * ro, cam, w, h);
    const [ox1, oy1] = worldToScreen(POND.x + Math.cos(a1) * ro, POND.z + Math.sin(a1) * ro, cam, w, h);
    const [ix1, iy1] = worldToScreen(POND.x + Math.cos(a1) * ri, POND.z + Math.sin(a1) * ri, cam, w, h);

    ctx.beginPath();
    ctx.moveTo(ix0, iy0);
    ctx.lineTo(ox0, oy0);
    ctx.lineTo(ox1, oy1);
    ctx.lineTo(ix1, iy1);
    ctx.closePath();

    const blend = 0.5 + Math.sin(aMid * 4) * 0.15;
    ctx.fillStyle = rgba(mix(SAND_WATER, GRASS_BASE, blend), 0.7 * dayBright);
    ctx.fill();
  }
}

function drawWater(
  ctx: CanvasRenderingContext2D,
  cam: CameraState,
  w: number, h: number,
  waterTime: number,
  timeBright: number
): void {
  const [cx, cy] = worldToScreen(POND.x, POND.z, cam, w, h);
  const r = POND.radius * cam.zoom;

  drawSandRing(ctx, cam, w, h, waterTime);

  const depthGrad = ctx.createRadialGradient(cx, cy, 0, cx, cy, r);
  depthGrad.addColorStop(0, rgba(brighten(WATER_DEEP, timeBright), 0.85));
  depthGrad.addColorStop(0.5, rgba(brighten(WATER_SHALLOW, timeBright), 0.75));
  depthGrad.addColorStop(0.85, rgba(brighten(WATER_SURFACE, timeBright), 0.65));
  depthGrad.addColorStop(1, rgba(brighten(WATER_SURFACE, timeBright), 0.15));
  ctx.fillStyle = depthGrad;
  ctx.beginPath();
  ctx.arc(cx, cy, r, 0, Math.PI * 2);
  ctx.fill();

  for (let i = 0; i < 4; i++) {
    const waveR = r * (0.3 + i * 0.15);
    const phase = waterTime * 1.2 + i * 1.7;
    const waveAlpha = 0.12 - i * 0.02;
    ctx.strokeStyle = rgba({ r: 200, g: 230, b: 255 }, waveAlpha);
    ctx.lineWidth = Math.max(0.5, 1 * cam.zoom);
    ctx.beginPath();
    ctx.ellipse(cx, cy + Math.sin(phase) * r * 0.03, waveR, waveR * 0.3, 0.1 + i * 0.05, 0, Math.PI * 2);
    ctx.stroke();
  }

  const reflX = cx - r * 0.25;
  const reflY = cy - r * 0.3;
  const reflR = r * 0.12;
  const reflGrad = ctx.createRadialGradient(reflX, reflY, 0, reflX, reflY, reflR);
  reflGrad.addColorStop(0, rgba({ r: 255, g: 255, b: 255 }, 0.12));
  reflGrad.addColorStop(1, rgba({ r: 255, g: 255, b: 255 }, 0));
  ctx.fillStyle = reflGrad;
  ctx.beginPath();
  ctx.arc(reflX, reflY, reflR, 0, Math.PI * 2);
  ctx.fill();
}

export function drawPlotBeds(
  ctx: CanvasRenderingContext2D,
  cam: CameraState,
  w: number, h: number,
  timeBright: number
): void {
  for (const p of PLOTS) {
    const corners: [number, number][] = [
      [p.cx - p.w / 2, p.cz - p.d / 2],
      [p.cx + p.w / 2, p.cz - p.d / 2],
      [p.cx + p.w / 2, p.cz + p.d / 2],
      [p.cx - p.w / 2, p.cz + p.d / 2],
    ];
    const sc = corners.map(([x, z]) => worldToScreen(x, z, cam, w, h));
    const sy = sc.reduce((s, p) => s + p[1], 0) / 4;
    const sx = sc.reduce((s, p) => s + p[0], 0) / 4;

    const shadowRX = p.w * cam.zoom * COS30 * 0.55;
    const shadowRY = p.d * cam.zoom * SIN30 * 0.50;
    ctx.fillStyle = rgba({ r: 0, g: 0, b: 0 }, 0.10);
    ctx.beginPath();
    ctx.ellipse(sx, sy + 2, Math.max(1, shadowRX), Math.max(1, shadowRY), 0, 0, Math.PI * 2);
    ctx.fill();

    ctx.beginPath();
    ctx.moveTo(sc[0][0], sc[0][1]);
    ctx.lineTo(sc[1][0], sc[1][1]);
    ctx.lineTo(sc[2][0], sc[2][1]);
    ctx.lineTo(sc[3][0], sc[3][1]);
    ctx.closePath();
    ctx.fillStyle = rgba(brighten(DIRT_BASE, timeBright * 0.9), 1);
    ctx.fill();

    const innerP = 3;
    const innerCorners: [number, number][] = [
      [p.cx - p.w / 2 + innerP, p.cz - p.d / 2 + innerP],
      [p.cx + p.w / 2 - innerP, p.cz - p.d / 2 + innerP],
      [p.cx + p.w / 2 - innerP, p.cz + p.d / 2 - innerP],
      [p.cx - p.w / 2 + innerP, p.cz + p.d / 2 - innerP],
    ];
    const isc = innerCorners.map(([x, z]) => worldToScreen(x, z, cam, w, h));
    ctx.beginPath();
    ctx.moveTo(isc[0][0], isc[0][1]);
    ctx.lineTo(isc[1][0], isc[1][1]);
    ctx.lineTo(isc[2][0], isc[2][1]);
    ctx.lineTo(isc[3][0], isc[3][1]);
    ctx.closePath();
    const soilColor = brighten({ r: 100, g: 72, b: 45 }, timeBright);
    ctx.fillStyle = rgb(soilColor);
    ctx.fill();

    ctx.strokeStyle = rgba(brighten({ r: 70, g: 50, b: 30 }, timeBright), 0.6);
    ctx.lineWidth = Math.max(1, 1.5 * cam.zoom);
    const rowCount = 4;
    for (let r = 1; r < rowCount; r++) {
      const frac = r / rowCount;
      const y1 = isc[0][1] + (isc[3][1] - isc[0][1]) * frac;
      const y2 = isc[1][1] + (isc[2][1] - isc[1][1]) * frac;
      const x1 = isc[0][0] + (isc[3][0] - isc[0][0]) * frac;
      const x2 = isc[1][0] + (isc[2][0] - isc[1][0]) * frac;
      ctx.beginPath();
      ctx.moveTo(x1, y1);
      ctx.lineTo(x2, y2);
      ctx.stroke();
    }

    ctx.strokeStyle = rgba(brighten({ r: 80, g: 58, b: 35 }, timeBright), 0.5);
    ctx.lineWidth = Math.max(1.5, 2 * cam.zoom);
    ctx.beginPath();
    ctx.moveTo(sc[0][0], sc[0][1]);
    ctx.lineTo(sc[1][0], sc[1][1]);
    ctx.lineTo(sc[2][0], sc[2][1]);
    ctx.lineTo(sc[3][0], sc[3][1]);
    ctx.closePath();
    ctx.stroke();
  }
}
export function drawEnclosureGround(
  ctx: CanvasRenderingContext2D,
  cam: CameraState,
  w: number, h: number,
  timeBright: number
): void {
  for (const enc of ENCLOSURES) {
    const b = enc.bounds;
    const corners: [number, number][] = [
      [b.minX, b.minZ], [b.maxX, b.minZ],
      [b.maxX, b.maxZ], [b.minX, b.maxZ],
    ];
    const sc = corners.map(([x, z]) => worldToScreen(x, z, cam, w, h));

    ctx.beginPath();
    ctx.moveTo(sc[0][0], sc[0][1]);
    ctx.lineTo(sc[1][0], sc[1][1]);
    ctx.lineTo(sc[2][0], sc[2][1]);
    ctx.lineTo(sc[3][0], sc[3][1]);
    ctx.closePath();
    ctx.fillStyle = rgba(brighten({ r: 100, g: 140, b: 70 }, timeBright * 0.95), 0.15);
    ctx.fill();
  }
}

function drawFenceLines(
  ctx: CanvasRenderingContext2D,
  cam: CameraState,
  w: number, h: number
): void {
  ctx.lineWidth = Math.max(1, 1.5 * cam.zoom);
  ctx.lineCap = "round";

  for (const enc of ENCLOSURES) {
    const b = enc.bounds;
    const postSpacing = 3;

    const edges: Array<{ from: [number, number]; to: [number, number] }> = [
      { from: [b.minX, b.minZ], to: [b.maxX, b.minZ] },
      { from: [b.maxX, b.minZ], to: [b.maxX, b.maxZ] },
      { from: [b.maxX, b.maxZ], to: [b.minX, b.maxZ] },
      { from: [b.minX, b.maxZ], to: [b.minX, b.minZ] },
    ];

    for (const edge of edges) {
      const dx = edge.to[0] - edge.from[0];
      const dz = edge.to[1] - edge.from[1];
      const len = Math.hypot(dx, dz);
      const segments = Math.max(1, Math.ceil(len / postSpacing));

      for (let i = 0; i <= segments; i++) {
        const t = i / segments;
        const wx = edge.from[0] + dx * t;
        const wz = edge.from[1] + dz * t;
        const [sx, sy] = worldToScreen(wx, wz, cam, w, h);
        const postH = 2.5;
        const [sxTop, syTop] = worldToScreen(wx, wz - postH, cam, w, h);

        ctx.strokeStyle = "#6b5b3a";
        ctx.lineWidth = Math.max(1.5, 2 * cam.zoom);
        ctx.beginPath();
        ctx.moveTo(sx, sy);
        ctx.lineTo(sxTop, syTop);
        ctx.stroke();

        ctx.fillStyle = "#8b7355";
        const pr = Math.max(1.5, 0.4 * cam.zoom);
        ctx.fillRect(sxTop - pr / 2, syTop - pr / 2, pr, pr);
      }

      const [sx1] = worldToScreen(edge.from[0], edge.from[1], cam, w, h);
      const [sx2] = worldToScreen(edge.to[0], edge.to[1], cam, w, h);
      const railH1 = worldToScreen(edge.from[0], edge.from[1] - 1.5, cam, w, h);
      const railH2 = worldToScreen(edge.to[0], edge.to[1] - 1.5, cam, w, h);

      ctx.strokeStyle = "#a08a60";
      ctx.lineWidth = Math.max(1, 1.5 * cam.zoom);
      ctx.beginPath();
      ctx.moveTo(sx1, railH1[1]);
      ctx.lineTo(sx2, railH2[1]);
      ctx.stroke();
    }
  }
}

export function renderTerrain(
  ctx: CanvasRenderingContext2D,
  cam: CameraState,
  w: number,
  h: number,
  timeOfDay: number,
  waterTime: number
): TerrainStats {
  const timeBright = 0.85 + timeOfDay * 0.15;
  const worldHalf = 320;

  const halfTiles = Math.ceil(Math.max(w, h) / (TILE_SIZE * cam.zoom)) + 3;
  const minWX = cam.x - halfTiles * TILE_SIZE;
  const maxWX = cam.x + halfTiles * TILE_SIZE;
  const minWZ = cam.z - halfTiles * TILE_SIZE;
  const maxWZ = cam.z + halfTiles * TILE_SIZE;

  const minIX = Math.max(-Math.floor(worldHalf / TILE_SIZE), Math.floor(minWX / TILE_SIZE));
  const maxIX = Math.min(Math.floor(worldHalf / TILE_SIZE), Math.ceil(maxWX / TILE_SIZE));
  const minIZ = Math.max(-Math.floor(worldHalf / TILE_SIZE), Math.floor(minWZ / TILE_SIZE));
  const maxIZ = Math.min(Math.floor(worldHalf / TILE_SIZE), Math.ceil(maxWZ / TILE_SIZE));

  let tilesDrawn = 0;
  let tilesVisible = 0;

  for (let iz = minIZ; iz <= maxIZ; iz++) {
    for (let ix = minIX; ix <= maxIX; ix++) {
      const tile = getTile(ix, iz);
      if (tile.kind === "water") continue;

      const wx0 = ix * TILE_SIZE;
      const wz0 = iz * TILE_SIZE;
      const hw = TILE_SIZE / 2;
      const hh = TILE_SIZE / 2;

      const [sx0, sy0] = worldToScreen(wx0, wz0, cam, w, h);
      const [sx1, sy1] = worldToScreen(wx0 + TILE_SIZE, wz0, cam, w, h);
      const [sx2, sy2] = worldToScreen(wx0 + TILE_SIZE, wz0 + TILE_SIZE, cam, w, h);
      const [sx3, sy3] = worldToScreen(wx0, wz0 + TILE_SIZE, cam, w, h);

      const pad = 50;
      if (sx0 < -pad && sx1 < -pad && sx2 < -pad && sx3 < -pad) continue;
      if (sx0 > w + pad && sx1 > w + pad && sx2 > w + pad && sx3 > w + pad) continue;
      if (sy0 < -pad && sy1 < -pad && sy2 < -pad && sy3 < -pad) continue;
      if (sy0 > h + pad && sy1 > h + pad && sy2 > h + pad && sy3 > h + pad) continue;
      tilesVisible++;

      const scx = (sx0 + sx1 + sx2 + sx3) / 4;
      const scy = (sy0 + sy1 + sy2 + sy3) / 4;
      const shw = Math.abs(sx1 - sx0) / 2;
      const shh = Math.abs(sy0 - sy3) / 2;

      if (tile.kind === "path") {
        const pathInfo = getPathTileInfo(ix, iz);
        drawPathTile(ctx, scx, scy, shw, shh, pathInfo, tile.variant, timeBright);
      } else {
        drawTileDetail(ctx, scx, scy, shw, shh, tile, timeBright);
      }

      const edges = getEdgeBlends(ix, iz);
      drawEdgeBlend(ctx, scx, scy, shw, shh, edges);

      tilesDrawn++;
    }
  }

  drawWater(ctx, cam, w, h, waterTime, timeBright);
  drawPlotBeds(ctx, cam, w, h, timeBright);
  drawEnclosureGround(ctx, cam, w, h, timeBright);
  drawFenceLines(ctx, cam, w, h);

  return { tilesDrawn, tilesVisible, tilesTotal: tilesVisible };
}
