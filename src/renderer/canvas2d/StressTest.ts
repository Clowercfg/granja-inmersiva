import type { AnimalAgent } from "../../types";
import type { PlantedCrop } from "../../store/cropStore";
import type { CameraState } from "./Camera2D";
import { worldToScreen } from "./Camera2D";

export interface StressConfig {
  plots: number;
  animals: number;
  buildings: number;
  vegetation: number;
}

export interface StressMetrics {
  label: string;
  totalEntities: number;
  firstDrawMs: number;
  avgFps: number;
  minFps: number;
  avgFrameMs: number;
  maxFrameMs: number;
  drawnEntities: number;
  visibleEntities: number;
}

export interface StressResult {
  config: StressConfig;
  metrics: StressMetrics;
}

const ANIMAL_KINDS: Array<"cow" | "chicken" | "rooster" | "pig"> = ["cow", "chicken", "rooster", "pig"];
const ANIMAL_NAMES = ["Bessie", "Clucky", "Porky", "Daisy", "Rex", "Molly", "Babe", "Tweety", "Hamlet", "Lulu"];

function rand(min: number, max: number): number {
  return min + Math.random() * (max - min);
}

function randInt(min: number, max: number): number {
  return Math.floor(rand(min, max + 1));
}

function pick<T>(arr: T[]): T {
  return arr[randInt(0, arr.length - 1)];
}

export function generateStressAnimals(count: number, idOffset: number): AnimalAgent[] {
  const animals: AnimalAgent[] = [];
  for (let i = 0; i < count; i++) {
    const kind = pick(ANIMAL_KINDS);
    animals.push({
      id: idOffset + i,
      kind,
      name: `${pick(ANIMAL_NAMES)}${i}`,
      position: [rand(-200, 200), 0, rand(-200, 200)],
      rotation: rand(0, Math.PI * 2),
      velocity: [0, 0, 0],
      state: "rest" as const,
      target: [0, 0, 0],
      bounds: { minX: -200, maxX: 200, minZ: -200, maxZ: 200 },
      actionTimer: 0,
      mood: 0.8,
      health: 1,
      scale: rand(0.8, 1.2),
      walkPhase: 0,
      idlePhase: 0,
      speed: rand(1, 3),
      pendingProduction: 0,
      nextHarvestAt: 0,
    });
  }
  return animals;
}

export function generateStressCrops(count: number): Record<number, PlantedCrop> {
  const map: Record<number, PlantedCrop> = {};
  const cropIds = ["wheat", "corn", "carrot", "potato"];
  for (let i = 0; i < count; i++) {
    map[i] = {
      id: 90000 + i,
      cropId: pick(cropIds),
      plotIndex: i,
      plantedAt: Date.now() - rand(0, 3600000),
      state: Math.random() > 0.3 ? "ready" : "growing",
      quantity: randInt(1, 5),
    };
  }
  return map;
}

export interface StressBuilding {
  type: string;
  x: number;
  z: number;
  halfW: number;
  halfD: number;
  wallH: number;
  label: string;
}

export function generateStressBuildings(count: number): StressBuilding[] {
  const kinds = ["barn", "house", "warehouse", "workshop", "greenhouse"];
  const buildings: StressBuilding[] = [];
  for (let i = 0; i < count; i++) {
    const kind = pick(kinds);
    buildings.push({
      type: kind,
      x: rand(-280, 280),
      z: rand(-280, 280),
      halfW: rand(3, 8),
      halfD: rand(3, 6),
      wallH: rand(4, 10),
      label: `${kind}-${i}`,
    });
  }
  return buildings;
}

export interface StressVegetation {
  x: number;
  z: number;
  kind: "tree" | "bush" | "flower" | "rock";
  scale: number;
  hue: number;
}

export function generateStressVegetation(count: number): StressVegetation[] {
  const kinds: StressVegetation["kind"][] = ["tree", "bush", "flower", "rock"];
  const veg: StressVegetation[] = [];
  for (let i = 0; i < count; i++) {
    veg.push({
      x: rand(-280, 280),
      z: rand(-280, 280),
      kind: pick(kinds),
      scale: rand(0.5, 2.0),
      hue: rand(80, 160),
    });
  }
  return veg;
}

export interface StressScene {
  crops: Record<number, PlantedCrop>;
  animals: AnimalAgent[];
  buildings: StressBuilding[];
  vegetation: StressVegetation[];
}

export function generateStressScene(config: StressConfig): StressScene {
  return {
    crops: generateStressCrops(config.plots),
    animals: generateStressAnimals(config.animals, 80000),
    buildings: generateStressBuildings(config.buildings),
    vegetation: generateStressVegetation(config.vegetation),
  };
}

const BLDG_COLORS: Record<string, { left: string; right: string; top: string; roof: string }> = {
  barn: { left: "#a08050", right: "#c4a06a", roof: "#8b4513", top: "#9e6b3a" },
  house: { left: "#d4c8b4", right: "#f0e8d8", roof: "#8b4513", top: "#c4a87a" },
  warehouse: { left: "#a8a8a8", right: "#d0d0d0", roof: "#808080", top: "#b8b8b8" },
  workshop: { left: "#baa078", right: "#d8c8a0", roof: "#8b4513", top: "#b8956a" },
  greenhouse: { left: "#80b880", right: "#b0d8b0", roof: "#5f9f5f", top: "#90c090" },
};

const ANIMAL_COLORS: Record<string, { body: string; accent: string; size: number }> = {
  cow: { body: "#8b6914", accent: "#f2efe7", size: 1.4 },
  chicken: { body: "#e8dcc8", accent: "#d63f2e", size: 0.7 },
  rooster: { body: "#c0392b", accent: "#e8a33d", size: 0.8 },
  pig: { body: "#e8a0a0", accent: "#d4867a", size: 1.1 },
};

function rgba(r: number, g: number, b: number, a: number): string {
  return `rgba(${r | 0},${g | 0},${b | 0},${a})`;
}

export function drawStressVegetation(
  ctx: CanvasRenderingContext2D,
  cam: CameraState,
  w: number, h: number,
  veg: StressVegetation[],
  timeOfDay: number
): { drawn: number; visible: number } {
  let drawn = 0;
  let visible = 0;
  const dayBright = 0.85 + timeOfDay * 0.15;

  for (const v of veg) {
    const [sx, sy] = worldToScreen(v.x, v.z, cam, w, h);
    if (sx < -50 || sx > w + 50 || sy < -50 || sy > h + 50) continue;
    visible++;

    const s = v.scale * cam.zoom;
    ctx.save();
    ctx.translate(sx, sy);

    if (v.kind === "tree") {
      ctx.fillStyle = rgba(60, 40, 20, 0.15 * dayBright);
      ctx.beginPath();
      ctx.ellipse(0, s * 1, s * 3, s * 1, 0, 0, Math.PI * 2);
      ctx.fill();

      ctx.strokeStyle = `hsl(30, 40%, ${30 * dayBright}%)`;
      ctx.lineWidth = Math.max(1, 2 * cam.zoom);
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.lineTo(0, -s * 8);
      ctx.stroke();

      ctx.fillStyle = `hsl(${v.hue}, ${50 + v.hue * 0.2}%, ${30 * dayBright}%)`;
      ctx.beginPath();
      ctx.arc(0, -s * 10, s * 5, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = `hsl(${v.hue + 10}, ${55 + v.hue * 0.2}%, ${38 * dayBright}%)`;
      ctx.beginPath();
      ctx.arc(-s * 2, -s * 8, s * 3, 0, Math.PI * 2);
      ctx.fill();
    } else if (v.kind === "bush") {
      ctx.fillStyle = `hsl(${v.hue}, 45%, ${30 * dayBright}%)`;
      ctx.beginPath();
      ctx.ellipse(0, -s * 2, s * 4, s * 3, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = `hsl(${v.hue + 5}, 50%, ${35 * dayBright}%)`;
      ctx.beginPath();
      ctx.ellipse(s * 1.5, -s * 3, s * 2.5, s * 2, 0, 0, Math.PI * 2);
      ctx.fill();
    } else if (v.kind === "flower") {
      ctx.fillStyle = `hsl(${v.hue + 200}, 70%, ${60 * dayBright}%)`;
      const petalR = s * 1.5;
      for (let p = 0; p < 5; p++) {
        const angle = (p / 5) * Math.PI * 2;
        ctx.beginPath();
        ctx.arc(Math.cos(angle) * petalR, -s * 2 + Math.sin(angle) * petalR, s * 0.8, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.fillStyle = "#f0c040";
      ctx.beginPath();
      ctx.arc(0, -s * 2, s * 0.6, 0, Math.PI * 2);
      ctx.fill();
    } else {
      ctx.fillStyle = `hsl(30, 10%, ${45 * dayBright}%)`;
      ctx.beginPath();
      ctx.ellipse(0, -s * 1, s * 3, s * 2, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = `hsl(30, 8%, ${55 * dayBright}%)`;
      ctx.beginPath();
      ctx.ellipse(s * 0.5, -s * 1.5, s * 2, s * 1.5, 0.2, 0, Math.PI * 2);
      ctx.fill();
    }

    ctx.restore();
    drawn++;
  }
  return { drawn, visible };
}

export function drawStressBuildings(
  ctx: CanvasRenderingContext2D,
  cam: CameraState,
  w: number, h: number,
  buildings: StressBuilding[]
): { drawn: number; visible: number } {
  let drawn = 0;
  let visible = 0;

  for (const b of buildings) {
    const [sx, sy] = worldToScreen(b.x, b.z, cam, w, h);
    const screenR = Math.max(b.halfW, b.halfD) * cam.zoom * 1.5;
    if (sx < -screenR || sx > w + screenR || sy < -screenR - b.wallH * cam.zoom || sy > h + screenR) continue;
    visible++;

    const colors = BLDG_COLORS[b.type] ?? BLDG_COLORS.barn;
    const hw = b.halfW * cam.zoom;
    const hd = b.halfD * cam.zoom;
    const wh = b.wallH * cam.zoom;
    const topY = sy - wh;

    ctx.fillStyle = colors.top;
    ctx.beginPath();
    ctx.moveTo(sx, topY - hd);
    ctx.lineTo(sx + hw, topY);
    ctx.lineTo(sx, topY + hd);
    ctx.lineTo(sx - hw, topY);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = "rgba(0,0,0,0.12)";
    ctx.lineWidth = 1;
    ctx.stroke();

    ctx.fillStyle = colors.left;
    ctx.beginPath();
    ctx.moveTo(sx - hw, topY);
    ctx.lineTo(sx - hw, sy);
    ctx.lineTo(sx, sy + hd);
    ctx.lineTo(sx, topY + hd);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = colors.right;
    ctx.beginPath();
    ctx.moveTo(sx + hw, topY);
    ctx.lineTo(sx + hw, sy);
    ctx.lineTo(sx, sy + hd);
    ctx.lineTo(sx, topY + hd);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    drawn++;
  }
  return { drawn, visible };
}

export class FPSTracker {
  private frameTimes: number[] = [];
  private lastFrame = 0;
  private recording = false;

  reset(): void {
    this.frameTimes = [];
    this.lastFrame = performance.now();
    this.recording = false;
  }

  tick(): void {
    const now = performance.now();
    const dt = now - this.lastFrame;
    this.lastFrame = now;
    if (this.recording && dt > 0) this.frameTimes.push(dt);
  }

  startRecording(): void {
    this.recording = true;
  }

  stop(): void {
    this.recording = false;
  }

  getMetrics(): {
    avgFps: number;
    minFps: number;
    avgFrameMs: number;
    maxFrameMs: number;
  } {
    if (this.frameTimes.length === 0) {
      return { avgFps: 0, minFps: 0, avgFrameMs: 0, maxFrameMs: 0 };
    }

    const ft = this.frameTimes.slice(-120);
    const avgMs = ft.reduce((s, v) => s + v, 0) / ft.length;
    const maxMs = Math.max(...ft);
    const avgFps = 1000 / avgMs;
    const minFps = 1000 / maxMs;

    return {
      avgFps: Math.round(avgFps * 10) / 10,
      minFps: Math.round(minFps * 10) / 10,
      avgFrameMs: Math.round(avgMs * 100) / 100,
      maxFrameMs: Math.round(maxMs * 100) / 100,
    };
  }
}

export const STRESS_TESTS: Array<{ label: string; config: StressConfig }> = [
  { label: "A - Normal",       config: { plots: 4,    animals: 5,   buildings: 5,  vegetation: 0 } },
  { label: "B - 200 plots",    config: { plots: 200,  animals: 5,   buildings: 5,  vegetation: 0 } },
  { label: "C - 100 animals",  config: { plots: 4,    animals: 100, buildings: 5,  vegetation: 0 } },
  { label: "D - 500 veg",      config: { plots: 4,    animals: 5,   buildings: 5,  vegetation: 500 } },
  { label: "E - Heavy",        config: { plots: 200,  animals: 100, buildings: 50, vegetation: 500 } },
];
