import {
  Scene,
  Engine,
  MeshBuilder,
  PBRMaterial,
  Color3,
  Vector3,
  VertexData,
  DynamicTexture,
} from "@babylonjs/core";
import type { ShadowGenerator } from "@babylonjs/core";
import type { BabylonSystem } from "../core/BabylonLifecycle";
import {
  WORLD,
  terrainHeight,
  terrainNormal,
  distanceToPaths,
  PLOTS,
  POND,
  PATH_WIDTH,
  smoothstep,
  type PlotRect,
} from "./terrainMath";

/* ═══════════════════════════════════════════════════════════════════════════
 *  COLOR PALETTE  (mirrors terrain.ts bakeColorTexture)
 * ═══════════════════════════════════════════════════════════════════════════ */

interface RGB { r: number; g: number; b: number }

const C_GRASS_A: RGB = hex("#4d7c33");
const C_GRASS_B: RGB = hex("#6a9a42");
const C_GRASS_C: RGB = hex("#3c662a");
const C_DIRT:    RGB = hex("#7a5a38");
const C_PATH:    RGB = hex("#8d6f48");
const C_SAND:    RGB = hex("#c3a464");
const C_ROCK:    RGB = hex("#7c8074");
const C_PLOT:    RGB = hex("#5e442e");

function hex(h: string): RGB {
  const n = parseInt(h.slice(1), 16);
  return { r: ((n >> 16) & 0xff) / 255, g: ((n >> 8) & 0xff) / 255, b: (n & 0xff) / 255 };
}

function lerpRGB(a: RGB, b: RGB, t: number): RGB {
  return {
    r: a.r + (b.r - a.r) * t,
    g: a.g + (b.g - a.g) * t,
    b: a.b + (b.b - a.b) * t,
  };
}

function mulRGB(c: RGB, s: number): RGB {
  return { r: c.r * s, g: c.g * s, b: c.b * s };
}

function clamp01(v: number): number {
  return v < 0 ? 0 : v > 1 ? 1 : v;
}

function hashColor(ix: number, iy: number, seed: number): number {
  let h = seed ^ (ix * 374761393) ^ (iy * 668265263);
  h = (h ^ (h >>> 13)) * 1274126177;
  h ^= h >>> 16;
  return (h >>> 0) / 4294967296;
}

/* ═══════════════════════════════════════════════════════════════════════════
 *  PROCEDURAL ALBEDO TEXTURE  (pure Canvas 2D, no THREE)
 * ═══════════════════════════════════════════════════════════════════════════ */

function bakeColorCanvas(res: number): HTMLCanvasElement {
  const canvas = document.createElement("canvas");
  canvas.width = res;
  canvas.height = res;
  const ctx = canvas.getContext("2d")!;
  const img = ctx.createImageData(res, res);
  const d = img.data;

  for (let j = 0; j < res; j++) {
    for (let i = 0; i < res; i++) {
      const u = i / (res - 1);
      const v = j / (res - 1);
      const x = -WORLD.half + u * WORLD.size;
      const z = -WORLD.half + v * WORLD.size;

      const n = terrainNormal(x, z, 1.2);
      const slope = clamp01(1 - n.y);

      const pathDist = distanceToPaths(x, z);
      const pathM = clamp01(1 - smoothstep(PATH_WIDTH - 1.2, PATH_WIDTH + 1.2, pathDist));

      let plotM = 0;
      for (const p of PLOTS) {
        const pm = pointInRectBake(x, z, p, 1.6);
        if (pm > plotM) plotM = pm;
      }

      const pd = Math.hypot(x - POND.x, z - POND.z);
      const sandM =
        smoothstep(POND.radius - 3, POND.radius + 1.5, pd) *
        (1 - smoothstep(POND.radius + 6, POND.radius + 10, pd));

      const rnd = hashColor(i, j, 7);
      const rnd2 = hashColor(i, j, 13);

      const grass = rnd < 0.55 ? C_GRASS_A : rnd < 0.85 ? C_GRASS_B : C_GRASS_C;
      let c = { ...grass };

      if (plotM > 0.01) c = lerpRGB(c, C_PLOT, plotM * 0.92);
      if (pathM > 0.01) c = lerpRGB(c, C_PATH, pathM * 0.94);
      if (sandM > 0.01) c = lerpRGB(c, C_SAND, sandM);
      if (slope > 0.32) c = lerpRGB(c, C_ROCK, smoothstep(0.32, 0.6, slope) * 0.9);

      const h = terrainHeight(x, z);
      if (h < -0.4) c = lerpRGB(c, C_DIRT, Math.min(1, (-0.4 - h) * 0.5));

      c = mulRGB(c, 0.9 + rnd2 * 0.2);
      if (slope < 0.15) c = mulRGB(c, 0.97);

      const idx = (j * res + i) * 4;
      d[idx]     = Math.round(clamp01(c.r) * 255);
      d[idx + 1] = Math.round(clamp01(c.g) * 255);
      d[idx + 2] = Math.round(clamp01(c.b) * 255);
      d[idx + 3] = 255;
    }
  }

  ctx.putImageData(img, 0, 0);
  return canvas;
}

function pointInRectBake(x: number, z: number, r: PlotRect, feather: number): number {
  const dx = Math.abs(x - r.cx) - r.w / 2;
  const dz = Math.abs(z - r.cz) - r.d / 2;
  const d = Math.hypot(Math.max(dx, 0), Math.max(dz, 0));
  const inside = Math.max(dx, dz) <= 0;
  return inside ? 1 : 1 - smoothstep(0, feather, d);
}

/* ═══════════════════════════════════════════════════════════════════════════
 *  TERRAIN SYSTEM
 * ═══════════════════════════════════════════════════════════════════════════ */

const RES = 128;          // mesh subdivisions
const TEX_RES = 512;      // albedo texture resolution (512 is enough for farm view)

export class TerrainSystem implements BabylonSystem {
  private scene!: Scene;
  private ground: any = null;
  private mat: PBRMaterial | null = null;
  private tex: DynamicTexture | null = null;

  init(scene: Scene, _engine: Engine): void {
    this.scene = scene;
    const shadows = (scene as any)._shadowGenerator as ShadowGenerator | undefined;

    /* ── Ground mesh ─────────────────────────────────────────────── */
    this.ground = MeshBuilder.CreateGround(
      "terrain",
      { width: WORLD.size, height: WORLD.size, subdivisions: RES, updatable: true },
      scene,
    );

    /* ── Sculpt heights ─────────────────────────────────────────── */
    const positions = this.ground.getVerticesData("position")! as Float32Array;
    for (let i = 0; i < positions.length; i += 3) {
      positions[i + 1] = terrainHeight(positions[i], positions[i + 2]);
    }
    this.ground.updateVerticesData("position", positions);

    /* ── Recompute normals ──────────────────────────────────────── */
    const indices = this.ground.getIndices()!;
    const normals: number[] = [];
    VertexData.ComputeNormals(positions, indices, normals);
    this.ground.updateVerticesData("normal", normals);

    /* ── Material ───────────────────────────────────────────────── */
    this.mat = new PBRMaterial("terrainMat", scene);
    this.mat.roughness = 1.0;
    this.mat.metallic = 0;
    this.mat.emissiveColor = new Color3(0.02, 0.03, 0.01);
    this.ground.material = this.mat;

    /* ── Procedural albedo texture ──────────────────────────────── */
    const canvas = bakeColorCanvas(TEX_RES);
    this.tex = new DynamicTexture("terrainAlbedo", { width: TEX_RES, height: TEX_RES }, scene, false);
    const texCtx = this.tex.getContext();
    texCtx.drawImage(canvas, 0, 0);
    this.tex.update(false);
    this.mat.albedoTexture = this.tex;

    /* ── Shadows ────────────────────────────────────────────────── */
    this.ground.receiveShadows = true;
    if (shadows) {
      shadows.addShadowCaster(this.ground);
    }
  }

  dispose(): void {
    this.tex?.dispose();
    this.mat?.dispose();
    this.ground?.dispose();
  }
}
