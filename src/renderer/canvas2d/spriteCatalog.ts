import { loadSprite, getSprite } from "./SpriteAtlas";

export interface SpriteEntry {
  url: string;
  worldW: number;
  anchorFrac: number;
}

const BUILDING_W: Record<string, number> = {
  house: 13,
  barn: 18.5,
  warehouse: 16.5,
  workshop: 12,
  greenhouse: 14.5,
};

const ANIMAL_W: Record<string, number> = {
  cow: 4.6,
  pig: 3.8,
  rooster: 2.6,
  chicken: 2.3,
};

const CROP_W: Record<string, number> = {
  carrot: 2.6,
  wheat: 3.0,
  corn: 3.4,
  potato: 3.0,
};

const ANIMAL_FRAMES = ["idle_01", "idle_02", "walk_01", "walk_02", "walk_03"] as const;

const CATALOG: Record<string, SpriteEntry> = {};

for (const [b, w] of Object.entries(BUILDING_W)) {
  CATALOG[`bldg:${b}`] = { url: `/assets/2d/buildings/${b}.webp`, worldW: w, anchorFrac: 210 / 256 };
}
for (const a of ["cow", "chicken", "rooster", "pig"]) {
  for (const f of ANIMAL_FRAMES) {
    CATALOG[`animal:${a}:${f}`] = {
      url: `/assets/2d/animals/${a}_${f}.webp`,
      worldW: ANIMAL_W[a],
      anchorFrac: 112 / 128,
    };
  }
}
for (const c of ["carrot", "wheat", "corn", "potato"]) {
  for (const st of ["seed", "growing", "ready"]) {
    CATALOG[`crop:${c}:${st}`] = {
      url: `/assets/2d/crops/${c}_${st}.webp`,
      worldW: CROP_W[c],
      anchorFrac: 112 / 128,
    };
  }
}
for (const v of [1, 2, 3]) {
  CATALOG[`tree:0${v}`] = { url: `/assets/2d/vegetation/tree_0${v}.webp`, worldW: 7, anchorFrac: 212 / 256 };
}
for (const v of [1, 2]) {
  CATALOG[`bush:0${v}`] = { url: `/assets/2d/vegetation/bush_0${v}.webp`, worldW: 3, anchorFrac: 112 / 128 };
  CATALOG[`rock:0${v}`] = { url: `/assets/2d/vegetation/rock_0${v}.webp`, worldW: 2.6, anchorFrac: 110 / 128 };
  CATALOG[`flower:0${v}`] = { url: `/assets/2d/vegetation/flower_0${v}.webp`, worldW: 1.7, anchorFrac: 111 / 128 };
}

export const ALL_SPRITE_KEYS = Object.keys(CATALOG);

export function preloadSceneSprites(): void {
  for (const key of ALL_SPRITE_KEYS) {
    loadSprite(key, CATALOG[key].url);
  }
}

export function spritesLoadedCount(): number {
  let n = 0;
  for (const key of ALL_SPRITE_KEYS) if (getSprite(key)) n++;
  return n;
}

export function isSpriteReady(key: string): boolean {
  return getSprite(key) !== null;
}

export function drawWorldSprite(
  ctx: CanvasRenderingContext2D,
  key: string,
  sx: number,
  sy: number,
  zoom: number,
  scaleMul = 1,
  flip = false
): boolean {
  const img = getSprite(key);
  const entry = CATALOG[key];
  if (!img || !entry) return false;
  const dw = entry.worldW * zoom * scaleMul;
  const dh = dw;
  ctx.save();
  ctx.translate(sx, sy);
  if (flip) ctx.scale(-1, 1);
  ctx.drawImage(img, -dw / 2, -entry.anchorFrac * dw, dw, dh);
  ctx.restore();
  return true;
}

export function cropStageKey(cropId: string, progress: number): string {
  const stage = progress < 0.15 ? "seed" : progress < 0.8 ? "growing" : "ready";
  return `crop:${cropId}:${stage}`;
}

export function animalFrameKey(kind: string, moving: boolean, phase: number): string {
  const frame = moving
    ? ANIMAL_FRAMES[2 + (Math.floor(phase) % 3)]
    : ANIMAL_FRAMES[Math.floor(phase) % 2];
  return `animal:${kind}:${frame}`;
}
