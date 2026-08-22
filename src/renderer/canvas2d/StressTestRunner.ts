import type { CameraState } from "./Camera2D";
import {
  generateStressScene,
  drawStressVegetation,
  drawStressBuildings,
  FPSTracker,
  STRESS_TESTS,
  type StressResult,
} from "./StressTest";
import type { PlantedCrop } from "../../store/cropStore";
import type { AnimalAgent } from "../../types";

const WARMUP_FRAMES = 30;
const TEST_FRAMES = 180;

const BLDG_COLORS: Record<string, { left: string; right: string; top: string; roof: string }> = {
  barn: { left: "#a08050", right: "#c4a06a", roof: "#8b4513", top: "#9e6b3a" },
  house: { left: "#d4c8b4", right: "#f0e8d8", roof: "#8b4513", top: "#c4a87a" },
  warehouse: { left: "#a8a8a8", right: "#d0d0d0", roof: "#808080", top: "#b8b8b8" },
  workshop: { left: "#baa078", right: "#d8c8a0", roof: "#8b4513", top: "#b8956a" },
  greenhouse: { left: "#80b880", right: "#b0d8b0", roof: "#5f9f5f", top: "#90c090" },
};

const ANIMAL_COLORS: Record<string, { body: string; size: number }> = {
  cow: { body: "#8b6914", size: 1.4 },
  chicken: { body: "#e8dcc8", size: 0.7 },
  rooster: { body: "#c0392b", size: 0.8 },
  pig: { body: "#e8a0a0", size: 1.1 },
};

function rgba(r: number, g: number, b: number, a: number): string {
  return `rgba(${r | 0},${g | 0},${b | 0},${a})`;
}

import { worldToScreen } from "./Camera2D";
import { PLOTS, POND, PATH_WIDTH, distanceToPaths } from "../../utils/terrainMath";
import { CROP_TYPES, PLOT_CROPS } from "../../config/crops";
import { growthProgressOf } from "../../store/cropStore";
import { STATIC_BUILDINGS } from "../../config/layout";
import { BUILDING_CONFIG } from "../../config/world";

const TILE = 8;
const COS30 = 0.866025;
const SIN30 = 0.5;

function tileHash(ix: number, iz: number): number {
  let h = (ix | 0) * 374761393 + (iz | 0) * 668265263;
  h = ((h ^ (h >> 13)) * 1274126177) | 0;
  return ((h ^ (h >> 16)) & 0x7fffffff) / 0x7fffffff;
}

type TileKind = "water" | "sand" | "path" | "dirt" | "grass";

const GRASS_BASE: [number, number, number] = [77, 124, 51];
const GRASS_VARIANTS: Array<[number, number, number]> = [
  [82, 130, 55], [72, 118, 48], [88, 138, 60], [68, 112, 45],
  [75, 122, 50], [85, 135, 58],
];
const PATH_COLOR: [number, number, number] = [158, 130, 95];
const PATH_EDGE: [number, number, number] = [130, 105, 75];
const WATER_DEEP: [number, number, number] = [55, 120, 175];
const WATER_SHALLOW: [number, number, number] = [80, 155, 200];
const SAND_COLOR: [number, number, number] = [195, 168, 115];
const DIRT_COLOR: [number, number, number] = [110, 82, 55];
const DIRT_DARK: [number, number, number] = [85, 62, 40];

function lerp(a: number, b: number, t: number): number { return a + (b - a) * t; }
function mixColor(a: [number, number, number], b: [number, number, number], t: number): [number, number, number] {
  return [lerp(a[0], b[0], t), lerp(a[1], b[1], t), lerp(a[2], b[2], t)];
}
function rgb(r: number, g: number, b: number): string { return `rgb(${r | 0},${g | 0},${b | 0})`; }

function classifyTile(wx: number, wz: number): TileKind {
  const pd = Math.hypot(wx - POND.x, wz - POND.z);
  if (pd < POND.radius) return "water";
  if (pd < POND.radius + 3.5) return "sand";
  if (distanceToPaths(wx, wz) < PATH_WIDTH * 0.8) return "path";
  for (const p of PLOTS) {
    if (Math.abs(wx - p.cx) < p.w / 2 + 2 && Math.abs(wz - p.cz) < p.d / 2 + 2) return "dirt";
  }
  return "grass";
}

function tileColor(kind: TileKind, h: number, timeOfDay: number): string {
  const dayBright = 0.85 + timeOfDay * 0.15;
  const v = (h - 0.5) * 12;
  let base: [number, number, number];
  switch (kind) {
    case "water": { const t = (Math.sin(h * 6.28) + 1) * 0.5; base = mixColor(WATER_DEEP, WATER_SHALLOW, t * 0.4); break; }
    case "sand": base = mixColor(SAND_COLOR, [210, 185, 140], h * 0.3); break;
    case "path": base = mixColor(PATH_COLOR, PATH_EDGE, h * 0.3); break;
    case "dirt": base = mixColor(DIRT_COLOR, DIRT_DARK, h * 0.25); break;
    default: { const variant = GRASS_VARIANTS[(h * GRASS_VARIANTS.length) | 0]; base = mixColor(GRASS_BASE, variant, h * 0.35); break; }
  }
  return rgb(Math.max(0, Math.min(255, (base[0] + v) * dayBright)), Math.max(0, Math.min(255, (base[1] + v) * dayBright)), Math.max(0, Math.min(255, (base[2] + v) * dayBright)));
}

function drawTerrain(ctx: CanvasRenderingContext2D, cam: CameraState, w: number, h: number, timeOfDay: number, waterTime: number): void {
  const halfTiles = Math.ceil(Math.max(w, h) / (TILE * cam.zoom)) + 3;
  const worldHalf = 320;
  const minWorldX = cam.x - halfTiles * TILE;
  const maxWorldX = cam.x + halfTiles * TILE;
  const minWorldZ = cam.z - halfTiles * TILE;
  const maxWorldZ = cam.z + halfTiles * TILE;
  const tileWorldSize = TILE;

  for (let wx = Math.max(-worldHalf, Math.floor(minWorldX / tileWorldSize) * tileWorldSize);
       wx <= Math.min(worldHalf, Math.ceil(maxWorldX / tileWorldSize) * tileWorldSize);
       wx += tileWorldSize) {
    for (let wz = Math.max(-worldHalf, Math.floor(minWorldZ / tileWorldSize) * tileWorldSize);
         wz <= Math.min(worldHalf, Math.ceil(maxWorldZ / tileWorldSize) * tileWorldSize);
         wz += tileWorldSize) {
      const ix = Math.round(wx / tileWorldSize);
      const iz = Math.round(wz / tileWorldSize);
      const kind = classifyTile(wx + tileWorldSize / 2, wz + tileWorldSize / 2);
      const color = tileColor(kind, tileHash(ix, iz), timeOfDay);
      const [sx, sy] = worldToScreen(wx, wz, cam, w, h);
      const [sx2, sy2] = worldToScreen(wx + tileWorldSize, wz, cam, w, h);
      const [sx3, sy3] = worldToScreen(wx + tileWorldSize, wz + tileWorldSize, cam, w, h);
      const [sx4, sy4] = worldToScreen(wx, wz + tileWorldSize, cam, w, h);
      if (sx < -100 && sx2 < -100 && sx3 < -100 && sx4 < -100) continue;
      if (sx > w + 100 && sx2 > w + 100 && sx3 > w + 100 && sx4 > w + 100) continue;
      if (sy < -100 && sy2 < -100 && sy3 < -100 && sy4 < -100) continue;
      if (sy > h + 100 && sy2 > h + 100 && sy3 > h + 100 && sy4 > h + 100) continue;
      ctx.beginPath();
      ctx.moveTo(sx, sy);
      ctx.lineTo(sx2, sy2);
      ctx.lineTo(sx3, sy3);
      ctx.lineTo(sx4, sy4);
      ctx.closePath();
      ctx.fillStyle = color;
      ctx.fill();
      if (kind === "water") {
        ctx.fillStyle = rgba(180, 220, 255, 0.15 + Math.sin(waterTime * 2 + ix * 0.7 + iz * 1.1) * 0.05);
        ctx.fill();
      }
    }
  }

  const pondScreen = worldToScreen(POND.x, POND.z, cam, w, h);
  const pondR = POND.radius * cam.zoom;
  const grad = ctx.createRadialGradient(pondScreen[0], pondScreen[1], 0, pondScreen[0], pondScreen[1], pondR);
  grad.addColorStop(0, rgba(30, 90, 160, 0.5));
  grad.addColorStop(0.6, rgba(50, 130, 200, 0.4));
  grad.addColorStop(1, rgba(80, 170, 230, 0.1));
  ctx.fillStyle = grad;
  ctx.beginPath();
  ctx.arc(pondScreen[0], pondScreen[1], pondR, 0, Math.PI * 2);
  ctx.fill();
}

function drawRealBuildings(ctx: CanvasRenderingContext2D, cam: CameraState, w: number, h: number): { drawn: number; visible: number } {
  let drawn = 0, visible = 0;
  for (const b of STATIC_BUILDINGS) {
    const [bx, , bz] = b.position;
    const config = BUILDING_CONFIG[b.type];
    const halfW = config ? config.size[0] / 2 : 4;
    const halfD = config ? config.size[1] / 2 : 4;
    const wallH = 6;
    const [sx, sy] = worldToScreen(bx, bz, cam, w, h);
    if (sx < -100 || sx > w + 100 || sy < -100 - wallH * cam.zoom || sy > h + 100) continue;
    visible++;
    const colors = BLDG_COLORS[b.type] ?? BLDG_COLORS.barn;
    const hw = halfW * cam.zoom, hd = halfD * cam.zoom, wh = wallH * cam.zoom;
    const topY = sy - wh;
    ctx.fillStyle = colors.top;
    ctx.beginPath();
    ctx.moveTo(sx, topY - hd); ctx.lineTo(sx + hw, topY); ctx.lineTo(sx, topY + hd); ctx.lineTo(sx - hw, topY);
    ctx.closePath(); ctx.fill(); ctx.strokeStyle = "rgba(0,0,0,0.12)"; ctx.lineWidth = 1; ctx.stroke();
    ctx.fillStyle = colors.left;
    ctx.beginPath();
    ctx.moveTo(sx - hw, topY); ctx.lineTo(sx - hw, sy); ctx.lineTo(sx, sy + hd); ctx.lineTo(sx, topY + hd);
    ctx.closePath(); ctx.fill(); ctx.stroke();
    ctx.fillStyle = colors.right;
    ctx.beginPath();
    ctx.moveTo(sx + hw, topY); ctx.lineTo(sx + hw, sy); ctx.lineTo(sx, sy + hd); ctx.lineTo(sx, topY + hd);
    ctx.closePath(); ctx.fill(); ctx.stroke();
    drawn++;
  }
  return { drawn, visible };
}

function drawStressAnimals(
  ctx: CanvasRenderingContext2D, cam: CameraState, w: number, h: number, animals: AnimalAgent[]
): { drawn: number; visible: number } {
  let drawn = 0, visible = 0;
  for (const animal of animals) {
    const [sx, sy] = worldToScreen(animal.position[0], animal.position[2], cam, w, h);
    if (sx < -50 || sx > w + 50 || sy < -50 || sy > h + 50) continue;
    visible++;
    const cfg = ANIMAL_COLORS[animal.kind] ?? { body: "#999", size: 1 };
    const bs = cfg.size * cam.zoom * (animal.scale || 1);
    ctx.fillStyle = rgba(0, 0, 0, 0.15);
    ctx.beginPath();
    ctx.ellipse(sx, sy + bs * 0.3, bs * 1.3, bs * 0.5, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = cfg.body;
    ctx.beginPath();
    ctx.ellipse(sx, sy - bs * 0.15, bs * 0.9, bs * 0.7, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = "rgba(0,0,0,0.15)";
    ctx.lineWidth = 1;
    ctx.stroke();
    drawn++;
  }
  return { drawn, visible };
}

function drawStressPlots(
  ctx: CanvasRenderingContext2D, cam: CameraState, w: number, h: number,
  cropMap: Record<number, PlantedCrop | undefined>, plotCount: number
): { drawn: number; visible: number } {
  let drawn = 0, visible = 0;
  for (let i = 0; i < plotCount; i++) {
    const px = -200 + (i % 20) * 22;
    const pz = -200 + Math.floor(i / 20) * 22;
    const pW = 15, pD = 13;
    const corners: [number, number][] = [
      [px - pW / 2, pz - pD / 2], [px + pW / 2, pz - pD / 2],
      [px + pW / 2, pz + pD / 2], [px - pW / 2, pz + pD / 2],
    ];
    const sc = corners.map(([x, z]) => worldToScreen(x, z, cam, w, h));
    const sx = sc.reduce((s, p) => s + p[0], 0) / 4;
    const sy = sc.reduce((s, p) => s + p[1], 0) / 4;
    if (sx < -50 || sx > w + 50 || sy < -50 || sy > h + 50) continue;
    visible++;
    ctx.beginPath();
    ctx.moveTo(sc[0][0], sc[0][1]); ctx.lineTo(sc[1][0], sc[1][1]);
    ctx.lineTo(sc[2][0], sc[2][1]); ctx.lineTo(sc[3][0], sc[3][1]);
    ctx.closePath();
    ctx.fillStyle = "#5e442e";
    ctx.fill();
    ctx.strokeStyle = "rgba(0,0,0,0.2)";
    ctx.lineWidth = 1;
    ctx.stroke();

    const crop = cropMap[i];
    if (crop) {
      const conf = CROP_TYPES.find(c => c.id === crop.cropId);
      if (conf) {
        const progress = growthProgressOf(crop);
        const stemH = conf.heightMax * progress * 4;
        for (let r = 0; r < 3; r++) {
          for (let c = 0; c < 3; c++) {
            const rx = px - pW / 2 + (c + 0.5) * (pW / 3);
            const rz = pz - pD / 2 + (r + 0.5) * (pD / 3);
            const [cx, cy] = worldToScreen(rx, rz, cam, w, h);
            if (stemH > 0.3) {
              ctx.strokeStyle = "#4a8c3f";
              ctx.lineWidth = Math.max(1, 1.2 * cam.zoom);
              ctx.beginPath();
              ctx.moveTo(cx, cy);
              ctx.lineTo(cx, cy - stemH * cam.zoom);
              ctx.stroke();
            }
          }
        }
      }
    }
    drawn++;
  }
  return { drawn, visible };
}

interface RenderResult {
  drawnTotal: number;
  visibleTotal: number;
}

function renderStressFrame(
  ctx: CanvasRenderingContext2D,
  canvas: HTMLCanvasElement,
  cam: CameraState,
  stressCropMap: Record<number, PlantedCrop>,
  stressAnimals: AnimalAgent[],
  stressBuildings: import("./StressTest").StressBuilding[],
  stressVegetation: import("./StressTest").StressVegetation[],
  waterTime: number,
  plotCount: number
): RenderResult {
  const w = canvas.width;
  const h = canvas.height;
  ctx.clearRect(0, 0, w, h);

  drawTerrain(ctx, cam, w, h, 0.5, waterTime);

  const rb = drawRealBuildings(ctx, cam, w, h);

  const rp = drawStressPlots(ctx, cam, w, h, stressCropMap, plotCount);

  const bv = drawStressBuildings(ctx, cam, w, h, stressBuildings);

  const ba = drawStressAnimals(ctx, cam, w, h, stressAnimals);

  const vv = drawStressVegetation(ctx, cam, w, h, stressVegetation, 0.5);

  return {
    drawnTotal: rb.drawn + rp.drawn + bv.drawn + ba.drawn + vv.drawn,
    visibleTotal: rb.visible + rp.visible + bv.visible + ba.visible + vv.visible,
  };
}

export async function runStressTests(
  canvas: HTMLCanvasElement,
  ctx: CanvasRenderingContext2D,
  cam: CameraState
): Promise<StressResult[]> {
  const results: StressResult[] = [];
  const tracker = new FPSTracker();
  const dpr = Math.min(window.devicePixelRatio || 1, 2);

  console.log("%c[StressTest] Starting Canvas2D stress tests...", "color: #ff6600; font-weight: bold; font-size: 14px");
  console.log(`[StressTest] Canvas: ${canvas.width}x${canvas.height} DPR=${dpr}`);
  console.log(`[StressTest] Running ${STRESS_TESTS.length} tests, ${WARMUP_FRAMES} warmup + ${TEST_FRAMES} measured frames each`);

  for (let t = 0; t < STRESS_TESTS.length; t++) {
    const test = STRESS_TESTS[t];
    const scene = generateStressScene(test.config);
    const totalEntityCount = test.config.plots + test.config.animals + test.config.buildings + test.config.vegetation;

    console.log(`%c[StressTest] TEST ${test.label} — ${totalEntityCount} entities`, "color: #00aaff; font-weight: bold");

    let waterTime = 0;
    let firstDrawTime = -1;

    tracker.reset();

    await new Promise<void>((resolve) => {
      let frame = 0;

      const tick = () => {
        if (frame >= WARMUP_FRAMES + TEST_FRAMES) {
          resolve();
          return;
        }

        waterTime += 0.016;

        const res = renderStressFrame(
          ctx, canvas, cam,
          scene.crops, scene.animals, scene.buildings, scene.vegetation,
          waterTime, test.config.plots
        );

        if (frame === 0) firstDrawTime = performance.now();

        tracker.tick();
        if (frame === WARMUP_FRAMES) tracker.startRecording();

        frame++;
        requestAnimationFrame(tick);
      };

      requestAnimationFrame(tick);
    });

    tracker.stop();
    const metrics = tracker.getMetrics();

    const result: StressResult = {
      config: test.config,
      metrics: {
        label: test.label,
        totalEntities: totalEntityCount,
        firstDrawMs: Math.round((performance.now() - firstDrawTime) * 100) / 100,
        avgFps: metrics.avgFps,
        minFps: metrics.minFps,
        avgFrameMs: metrics.avgFrameMs,
        maxFrameMs: metrics.maxFrameMs,
        drawnEntities: 0,
        visibleEntities: 0,
      },
    };
    results.push(result);

    console.log(`  → avg ${metrics.avgFps} fps, min ${metrics.minFps} fps, avg frame ${metrics.avgFrameMs}ms, max ${metrics.maxFrameMs}ms`);

    await new Promise(r => setTimeout(r, 200));
  }

  console.log("%c[StressTest] All tests complete!", "color: #00ff00; font-weight: bold; font-size: 14px");

  const header = "Test".padEnd(22) + "|".padStart(2) + "Ent".padStart(6) + " | ".padStart(2) + "1stDraw".padStart(9) + " | " + "AvgFPS".padStart(7) + " | " + "MinFPS".padStart(7) + " | " + "AvgMs".padStart(7) + " | " + "MaxMs".padStart(7);
  const sep = "-".repeat(header.length);

  console.log(`%c${header}`, "font-family: monospace; font-weight: bold");
  console.log(sep);
  for (const r of results) {
    const line = `${r.metrics.label.padEnd(22)}| ${String(r.metrics.totalEntities).padStart(5)} | ${r.metrics.firstDrawMs.toFixed(1).padStart(8)} | ${String(r.metrics.avgFps).padStart(7)} | ${String(r.metrics.minFps).padStart(7)} | ${r.metrics.avgFrameMs.toFixed(2).padStart(7)} | ${r.metrics.maxFrameMs.toFixed(2).padStart(7)}`;
    console.log(`%c${line}`, "font-family: monospace");
  }

  console.log("\n%c[StressTest] Analysis:", "font-weight: bold; font-size: 13px");
  const testE = results[results.length - 1];
  if (testE) {
    if (testE.metrics.avgFps >= 55) {
      console.log("%c✓ Canvas2D handles the heaviest scene comfortably (≥55 avg fps)", "color: #00cc00; font-weight: bold");
    } else if (testE.metrics.avgFps >= 30) {
      console.log("%c⚠ Canvas2D is marginal on the heaviest scene (30-55 avg fps)", "color: #ffaa00; font-weight: bold");
    } else {
      console.log("%c✗ Canvas2D struggles on the heaviest scene (<30 avg fps)", "color: #ff3300; font-weight: bold");
    }

    const maxFrame = testE.metrics.maxFrameMs;
    if (maxFrame > 33) {
      console.log(`  Peak frame time ${maxFrame.toFixed(1)}ms exceeds 33ms (30fps threshold)`);
    }
    if (maxFrame > 100) {
      console.log("  → Viewport culling radius may need tightening");
    }
    if (maxFrame > 50) {
      console.log("  → Consider batching similar entity draws");
    }
  }

  return results;
}

export function isStressMode(): boolean {
  return new URLSearchParams(window.location.search).get("stress") === "true";
}
