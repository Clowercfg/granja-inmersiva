import type { CameraState } from "./Camera2D";
import { worldToScreen } from "./Camera2D";
import { PLOTS } from "../../utils/terrainMath";
import { STATIC_BUILDINGS } from "../../config/layout";
import { BUILDING_CONFIG } from "../../config/world";
import type { PlantedCrop } from "../../store/cropStore";
import { growthProgressOf } from "../../store/cropStore";
import { CROP_TYPES, PLOT_CROPS } from "../../config/crops";
import type { AnimalAgent } from "../../types";
import { renderTerrain } from "./TerrainRenderer";

const COS30 = 0.866025;
const SIN30 = 0.5;

const BLDG_FACES: Record<string, { left: string; right: string; roof: string; top: string }> = {
  barn: { left: "#a08050", right: "#c4a06a", roof: "#8b4513", top: "#9e6b3a" },
  house: { left: "#d4c8b4", right: "#f0e8d8", roof: "#8b4513", top: "#c4a87a" },
  cowPen: { left: "#7a6345", right: "#9c8466", roof: "#6b5b3a", top: "#8b7355" },
  chickenPen: { left: "#7a6345", right: "#9c8466", roof: "#6b5b3a", top: "#8b7355" },
  warehouse: { left: "#a8a8a8", right: "#d0d0d0", roof: "#808080", top: "#b8b8b8" },
  greenhouse: { left: "#80b880", right: "#b0d8b0", roof: "#5f9f5f", top: "#90c090" },
  workshop: { left: "#baa078", right: "#d8c8a0", roof: "#8b4513", top: "#b8956a" },
};

const ANIMAL_BODY: Record<string, { body: string; accent: string; size: number }> = {
  cow: { body: "#8b6914", accent: "#f2efe7", size: 1.4 },
  chicken: { body: "#e8dcc8", accent: "#d63f2e", size: 0.7 },
  rooster: { body: "#c0392b", accent: "#e8a33d", size: 0.8 },
  pig: { body: "#e8a0a0", accent: "#d4867a", size: 1.1 },
};

function rgba(r: number, g: number, b: number, a: number): string {
  return `rgba(${r | 0},${g | 0},${b | 0},${a})`;
}

function drawShadow(ctx: CanvasRenderingContext2D, sx: number, sy: number, rx: number, ry: number, alpha = 0.18): void {
  ctx.save();
  ctx.fillStyle = rgba(0, 0, 0, alpha);
  ctx.beginPath();
  ctx.ellipse(sx, sy + 2, Math.max(1, rx), Math.max(1, ry), 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

function drawIsoBox(
  ctx: CanvasRenderingContext2D,
  sx: number, sy: number,
  halfW: number, halfD: number,
  wallH: number,
  colors: { left: string; right: string; top: string; roof: string }
): void {
  const topY = sy - wallH;
  const roofH = wallH * 0.45;
  const hd = halfD;
  const hw = halfW;

  ctx.beginPath();
  ctx.moveTo(sx, topY - hd);
  ctx.lineTo(sx + hw, topY);
  ctx.lineTo(sx, topY + hd);
  ctx.lineTo(sx - hw, topY);
  ctx.closePath();
  ctx.fillStyle = colors.top;
  ctx.fill();
  ctx.strokeStyle = "rgba(0,0,0,0.12)";
  ctx.lineWidth = 1;
  ctx.stroke();

  ctx.beginPath();
  ctx.moveTo(sx - hw, topY);
  ctx.lineTo(sx - hw, sy);
  ctx.lineTo(sx, sy + hd);
  ctx.lineTo(sx, topY + hd);
  ctx.closePath();
  ctx.fillStyle = colors.left;
  ctx.fill();
  ctx.strokeStyle = "rgba(0,0,0,0.15)";
  ctx.lineWidth = 1;
  ctx.stroke();

  ctx.beginPath();
  ctx.moveTo(sx + hw, topY);
  ctx.lineTo(sx + hw, sy);
  ctx.lineTo(sx, sy + hd);
  ctx.lineTo(sx, topY + hd);
  ctx.closePath();
  ctx.fillStyle = colors.right;
  ctx.fill();
  ctx.stroke();

  const rx = hw + 2;
  const ry = hd + 2;
  ctx.beginPath();
  ctx.moveTo(sx, topY - ry - roofH);
  ctx.lineTo(sx + rx + 1, topY - ry * 0.15);
  ctx.lineTo(sx + rx + 1, topY + ry * 0.15);
  ctx.lineTo(sx - rx - 1, topY + ry * 0.15);
  ctx.lineTo(sx - rx - 1, topY - ry * 0.15);
  ctx.closePath();
  ctx.fillStyle = colors.roof;
  ctx.fill();
  ctx.strokeStyle = "rgba(0,0,0,0.18)";
  ctx.stroke();

  ctx.beginPath();
  ctx.moveTo(sx - rx - 1, topY - ry * 0.15);
  ctx.lineTo(sx, topY - ry - roofH);
  ctx.lineTo(sx + rx + 1, topY - ry * 0.15);
  ctx.closePath();
  ctx.fillStyle = colors.top;
  ctx.fill();
  ctx.stroke();
}

function drawAnimal(
  ctx: CanvasRenderingContext2D,
  cam: CameraState,
  canvasW: number, canvasH: number,
  animal: AnimalAgent,
  isSelected: boolean
): void {
  const [sx, sy] = worldToScreen(animal.position[0], animal.position[2], cam, canvasW, canvasH);
  const cfg = ANIMAL_BODY[animal.kind] ?? { body: "#999", accent: "#666", size: 1 };
  const baseSize = cfg.size * cam.zoom * (animal.scale || 1);

  drawShadow(ctx, sx, sy + baseSize * 0.3, baseSize * 1.3, baseSize * 0.5);

  ctx.save();
  ctx.translate(sx, sy);

  if (animal.kind === "cow") {
    const bodyW = baseSize * 1.6;
    const bodyH = baseSize * 0.9;
    ctx.beginPath();
    ctx.ellipse(0, -baseSize * 0.2, bodyW, bodyH, 0, 0, Math.PI * 2);
    ctx.fillStyle = cfg.body;
    ctx.fill();
    ctx.strokeStyle = "rgba(0,0,0,0.2)";
    ctx.lineWidth = 1;
    ctx.stroke();

    ctx.beginPath();
    ctx.ellipse(bodyW * 0.2, -baseSize * 0.35, bodyW * 0.35, bodyH * 0.4, 0.2, 0, Math.PI * 2);
    ctx.fillStyle = cfg.accent;
    ctx.fill();

    const headX = bodyW * 0.85;
    const headY = -baseSize * 0.4;
    const headR = baseSize * 0.45;
    ctx.beginPath();
    ctx.ellipse(headX, headY, headR, headR * 0.8, 0, 0, Math.PI * 2);
    ctx.fillStyle = cfg.body;
    ctx.fill();
    ctx.stroke();

    ctx.beginPath();
    ctx.ellipse(headX + headR * 0.3, headY, headR * 0.5, headR * 0.4, 0, 0, Math.PI * 2);
    ctx.fillStyle = "#e8b4a0";
    ctx.fill();

    const legY = baseSize * 0.35;
    ctx.strokeStyle = cfg.body;
    ctx.lineWidth = Math.max(2, baseSize * 0.25);
    ctx.lineCap = "round";
    for (const lx of [-bodyW * 0.45, -bodyW * 0.15, bodyW * 0.15, bodyW * 0.45]) {
      ctx.beginPath();
      ctx.moveTo(lx, legY - baseSize * 0.1);
      ctx.lineTo(lx, legY + baseSize * 0.3);
      ctx.stroke();
    }
  } else if (animal.kind === "chicken" || animal.kind === "rooster") {
    const bodyR = baseSize * 0.8;
    ctx.beginPath();
    ctx.ellipse(0, -baseSize * 0.15, bodyR, bodyR * 0.85, 0, 0, Math.PI * 2);
    ctx.fillStyle = cfg.body;
    ctx.fill();
    ctx.strokeStyle = "rgba(0,0,0,0.2)";
    ctx.lineWidth = 1;
    ctx.stroke();

    const headR = bodyR * 0.45;
    const headX = bodyR * 0.6;
    const headY = -baseSize * 0.55;
    ctx.beginPath();
    ctx.arc(headX, headY, headR, 0, Math.PI * 2);
    ctx.fillStyle = cfg.body;
    ctx.fill();
    ctx.stroke();

    ctx.beginPath();
    ctx.moveTo(headX + headR * 0.5, headY);
    ctx.lineTo(headX + headR * 1.2, headY - headR * 0.1);
    ctx.lineTo(headX + headR * 0.5, headY + headR * 0.2);
    ctx.closePath();
    ctx.fillStyle = "#e8a33d";
    ctx.fill();

    if (animal.kind === "rooster") {
      ctx.beginPath();
      ctx.moveTo(headX, headY - headR);
      ctx.lineTo(headX - headR * 0.2, headY - headR * 1.8);
      ctx.lineTo(headX + headR * 0.1, headY - headR * 1.5);
      ctx.lineTo(headX + headR * 0.3, headY - headR * 1.9);
      ctx.lineTo(headX + headR * 0.2, headY - headR);
      ctx.closePath();
      ctx.fillStyle = "#d63f2e";
      ctx.fill();
    } else {
      ctx.beginPath();
      ctx.arc(headX, headY - headR * 0.8, headR * 0.35, 0, Math.PI * 2);
      ctx.fillStyle = "#d63f2e";
      ctx.fill();
    }

    const tailX = -bodyR * 0.7;
    const tailY = -baseSize * 0.5;
    ctx.beginPath();
    ctx.moveTo(tailX, tailY + bodyR * 0.3);
    ctx.quadraticCurveTo(tailX - bodyR * 0.5, tailY - bodyR * 0.3, tailX - bodyR * 0.2, tailY - bodyR * 0.8);
    ctx.strokeStyle = animal.kind === "rooster" ? "#2c3e50" : "#7a4a2e";
    ctx.lineWidth = Math.max(1.5, baseSize * 0.2);
    ctx.stroke();

    ctx.strokeStyle = "#e8a33d";
    ctx.lineWidth = Math.max(1, baseSize * 0.12);
    ctx.lineCap = "round";
    for (const lx of [-bodyR * 0.2, bodyR * 0.2]) {
      ctx.beginPath();
      ctx.moveTo(lx, baseSize * 0.25);
      ctx.lineTo(lx, baseSize * 0.5);
      ctx.stroke();
    }
  } else if (animal.kind === "pig") {
    const bodyW = baseSize * 1.2;
    const bodyH = baseSize * 0.85;
    ctx.beginPath();
    ctx.ellipse(0, -baseSize * 0.15, bodyW, bodyH, 0, 0, Math.PI * 2);
    ctx.fillStyle = cfg.body;
    ctx.fill();
    ctx.strokeStyle = "rgba(0,0,0,0.15)";
    ctx.lineWidth = 1;
    ctx.stroke();

    const headX = bodyW * 0.75;
    const headY = -baseSize * 0.25;
    const headR = baseSize * 0.4;
    ctx.beginPath();
    ctx.ellipse(headX, headY, headR, headR * 0.85, 0, 0, Math.PI * 2);
    ctx.fillStyle = cfg.body;
    ctx.fill();
    ctx.stroke();

    const snoutX = headX + headR * 0.5;
    const snoutY = headY + headR * 0.1;
    ctx.beginPath();
    ctx.ellipse(snoutX, snoutY, headR * 0.4, headR * 0.3, 0, 0, Math.PI * 2);
    ctx.fillStyle = cfg.accent;
    ctx.fill();

    ctx.fillStyle = "rgba(0,0,0,0.3)";
    ctx.beginPath();
    ctx.arc(snoutX - headR * 0.1, snoutY, headR * 0.08, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(snoutX + headR * 0.1, snoutY, headR * 0.08, 0, Math.PI * 2);
    ctx.fill();

    ctx.beginPath();
    ctx.ellipse(headX - headR * 0.1, headY - headR * 0.6, headR * 0.3, headR * 0.2, -0.3, 0, Math.PI * 2);
    ctx.fillStyle = cfg.accent;
    ctx.fill();
  }

  ctx.restore();

  ctx.fillStyle = "rgba(255,255,255,0.85)";
  ctx.font = `bold ${Math.max(8, 9 * cam.zoom)}px sans-serif`;
  ctx.textAlign = "center";
  ctx.fillText(animal.name, sx, sy - baseSize * 1.5);

  if (isSelected) {
    ctx.beginPath();
    ctx.ellipse(sx, sy + baseSize * 0.2, baseSize * 1.8, baseSize * 0.7, 0, 0, Math.PI * 2);
    ctx.strokeStyle = "#ffcc00";
    ctx.lineWidth = 2.5;
    ctx.stroke();
  }
}
function drawCropPlot(
  ctx: CanvasRenderingContext2D,
  cam: CameraState,
  canvasW: number, canvasH: number,
  plot: { cx: number; cz: number; w: number; d: number },
  crop: PlantedCrop | undefined,
  plotIndex: number,
  isSelected: boolean
): void {
  const corners: [number, number][] = [
    [plot.cx - plot.w / 2, plot.cz - plot.d / 2],
    [plot.cx + plot.w / 2, plot.cz - plot.d / 2],
    [plot.cx + plot.w / 2, plot.cz + plot.d / 2],
    [plot.cx - plot.w / 2, plot.cz + plot.d / 2],
  ];
  const sc = corners.map(([x, z]) => worldToScreen(x, z, cam, canvasW, canvasH));

  const sy = sc.reduce((s, p) => s + p[1], 0) / 4;
  const sx = sc.reduce((s, p) => s + p[0], 0) / 4;

  const rows = 4;
  const cols = 4;
  const plotConf = PLOTS[plotIndex];
  if (!plotConf) return;

  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const rx = plot.cx - plot.w / 2 + (c + 0.5) * (plot.w / cols);
      const rz = plot.cz - plot.d / 2 + (r + 0.5) * (plot.d / rows);
      const [px, py] = worldToScreen(rx, rz, cam, canvasW, canvasH);

      const shouldPlant = crop || PLOT_CROPS[plotIndex];
      if (shouldPlant && crop) {
        const conf = CROP_TYPES.find(c => c.id === crop.cropId);
        if (conf) {
          const progress = growthProgressOf(crop);
          const h = conf.heightMax * progress;

          if (h > 0.1) {
            const stemH = h * 4;
            ctx.strokeStyle = "#4a8c3f";
            ctx.lineWidth = Math.max(1, 1.2 * cam.zoom);
            ctx.beginPath();
            ctx.moveTo(px, py);
            ctx.lineTo(px, py - stemH * cam.zoom);
            ctx.stroke();

            const leafSize = 1.5 * cam.zoom * progress;
            ctx.fillStyle = `hsl(${110 + progress * 20}, ${50 + progress * 20}%, ${35 + progress * 15}%)`;
            ctx.beginPath();
            ctx.ellipse(px - leafSize * 0.5, py - stemH * cam.zoom * 0.6, leafSize, leafSize * 0.5, -0.3, 0, Math.PI * 2);
            ctx.fill();
            ctx.beginPath();
            ctx.ellipse(px + leafSize * 0.5, py - stemH * cam.zoom * 0.4, leafSize * 0.8, leafSize * 0.4, 0.3, 0, Math.PI * 2);
            ctx.fill();

            if (progress >= 0.8) {
              const fruitSize = 1.8 * cam.zoom * progress;
              ctx.fillStyle = conf.color ?? "#f0c040";
              ctx.beginPath();
              ctx.arc(px, py - stemH * cam.zoom * 0.9, fruitSize, 0, Math.PI * 2);
              ctx.fill();
              ctx.strokeStyle = "rgba(0,0,0,0.15)";
              ctx.lineWidth = 0.5;
              ctx.stroke();
            }
          }
        }
      } else {
        const seedH = 0.6 * cam.zoom;
        ctx.fillStyle = "rgba(90,70,40,0.5)";
        ctx.beginPath();
        ctx.arc(px, py, Math.max(1, 1.2 * cam.zoom), 0, Math.PI * 2);
        ctx.fill();
      }
    }
  }

  const label = crop ? CROP_TYPES.find(c => c.id === crop.cropId)?.name ?? crop.cropId : "Empty";
  const progress = crop ? growthProgressOf(crop) : 0;
  const statusText = crop ? `${label} ${Math.round(progress * 100)}%` : "Empty";
  ctx.fillStyle = "rgba(255,255,255,0.8)";
  ctx.font = `bold ${Math.max(8, 9 * cam.zoom)}px sans-serif`;
  ctx.textAlign = "center";
  ctx.fillText(statusText, sx, sy - Math.max(8, 10 * cam.zoom));

  if (isSelected) {
    ctx.beginPath();
    ctx.moveTo(sc[0][0], sc[0][1]);
    ctx.lineTo(sc[1][0], sc[1][1]);
    ctx.lineTo(sc[2][0], sc[2][1]);
    ctx.lineTo(sc[3][0], sc[3][1]);
    ctx.closePath();
    ctx.strokeStyle = "#ffcc00";
    ctx.lineWidth = 2.5;
    ctx.stroke();
  }
}

function buildSortedEntities(
  animals: AnimalAgent[],
  cam: CameraState,
  canvasW: number,
  canvasH: number,
  cropMap: Record<number, PlantedCrop | undefined>
): Array<{ sortKey: number; draw: () => void }> {
  const entities: Array<{ sortKey: number; draw: () => void }> = [];

  for (const b of STATIC_BUILDINGS) {
    const config = BUILDING_CONFIG[b.type];
    const halfW = config ? config.size[0] / 2 : 4;
    const halfD = config ? config.size[1] / 2 : 4;
    const wallH = 6;
    const [bx, , bz] = b.position;
    const [, sy] = worldToScreen(bx, bz, cam, canvasW, canvasH);
    const colors = BLDG_FACES[b.type] ?? BLDG_FACES.barn;
    entities.push({
      sortKey: sy,
      draw: () => {
        if (!ctx) return;
        const [sx, syy] = worldToScreen(bx, bz, cam, canvasW, canvasH);
        drawShadow(ctx, sx, syy, halfW * 0.9, halfD * 0.6, 0.15);
        drawIsoBox(ctx, sx, syy, halfW * cam.zoom, halfD * cam.zoom, wallH * cam.zoom, colors);
        ctx.fillStyle = "rgba(255,255,255,0.8)";
        ctx.font = `bold ${Math.max(8, 9 * cam.zoom)}px sans-serif`;
        ctx.textAlign = "center";
        ctx.fillText(config?.label ?? b.type, sx, syy - wallH * cam.zoom - 8);
      }
    });
  }

  for (const p of PLOTS) {
    const corners: [number, number][] = [
      [p.cx - p.w / 2, p.cz - p.d / 2],
      [p.cx + p.w / 2, p.cz - p.d / 2],
      [p.cx + p.w / 2, p.cz + p.d / 2],
      [p.cx - p.w / 2, p.cz + p.d / 2],
    ];
    const sc = corners.map(([x, z]) => worldToScreen(x, z, cam, canvasW, canvasH));
    const sy = sc.reduce((s, p) => s + p[1], 0) / 4;
    const sx = sc.reduce((s, p) => s + p[0], 0) / 4;
    const idx = PLOTS.indexOf(p);
    entities.push({
      sortKey: sy + 0.1,
      draw: () => { if (ctx) drawCropPlot(ctx, cam, canvasW, canvasH, p, cropMap[idx], idx, false); }
    });
  }

  for (const animal of animals) {
    const [, sy] = worldToScreen(animal.position[0], animal.position[2], cam, canvasW, canvasH);
    entities.push({
      sortKey: sy,
      draw: () => { if (ctx) drawAnimal(ctx, cam, canvasW, canvasH, animal, false); }
    });
  }

  entities.sort((a, b) => a.sortKey - b.sortKey);
  return entities;
}

let ctx: CanvasRenderingContext2D | null = null;

export function init(canvas: HTMLCanvasElement): void {
  ctx = canvas.getContext("2d");
}

export function resize(w: number, h: number): void {
  if (!ctx) return;
  const canvas = ctx.canvas;
  canvas.width = w;
  canvas.height = h;
}

let waterTime = 0;

export function renderFrame(
  canvas: HTMLCanvasElement,
  cam: CameraState,
  cropMap: Record<number, PlantedCrop | undefined>,
  animals: AnimalAgent[],
  timeOfDay: number
): void {
  if (!ctx) return;
  const w = canvas.width;
  const h = canvas.height;

  ctx.clearRect(0, 0, w, h);

  waterTime += 0.016;

  renderTerrain(ctx, cam, w, h, timeOfDay, waterTime);

  const entities = buildSortedEntities(animals, cam, w, h, cropMap);
  for (const ent of entities) {
    ent.draw();
  }
}

export function destroy(): void {
  ctx = null;
}
