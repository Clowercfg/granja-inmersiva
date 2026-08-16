import * as THREE from "three";

export interface ShelfDef {
  id: string;
  x: number;
  z: number;
  /** 1 = la cara del estante mira hacia +z; -1 = mira hacia -z. */
  facing: 1 | -1;
}

export const STORAGE_SHELVES: ShelfDef[] = [
  { id: "wheat", x: -2.7, z: -3.6, facing: 1 },
  { id: "carrot", x: 0, z: -3.6, facing: 1 },
  { id: "potato", x: 2.7, z: -3.6, facing: 1 },
];

export const GOODS_SHELVES: ShelfDef[] = [
  { id: "milk", x: -5.4, z: 3.6, facing: -1 },
  { id: "eggs", x: -3.0, z: 3.6, facing: -1 },
  { id: "honey", x: 3.0, z: 3.6, facing: -1 },
  { id: "cheese", x: 5.4, z: 3.6, facing: -1 },
];

export const BOARDS_Y = [0.55, 1.25, 1.95];
export const CRATES_PER_BOARD = 8;
export const MAX_CRATES = CRATES_PER_BOARD * BOARDS_Y.length;

export interface CrateSpot {
  x: number;
  y: number;
  z: number;
}

/** Posiciones locales (relativas al estante) de las cajas/unidades de un producto. */
export function crateSpots(count: number): CrateSpot[] {
  const n = Math.min(count, MAX_CRATES);
  const out: CrateSpot[] = [];
  for (let i = 0; i < n; i++) {
    const board = Math.floor(i / CRATES_PER_BOARD);
    const k = i % CRATES_PER_BOARD;
    const col = k % 4;
    const row = Math.floor(k / 4);
    out.push({
      x: (col - 1.5) * 0.42,
      y: BOARDS_Y[board] + 0.12,
      z: (row - 0.5) * 0.36,
    });
  }
  return out;
}

export function itemShelf(id: string): ShelfDef | null {
  return STORAGE_SHELVES.find((s) => s.id === id) ?? GOODS_SHELVES.find((s) => s.id === id) ?? null;
}

/** Posición local (dentro del interior) de una caja/unidad concreta de un producto. */
export function itemLocalPos(id: string, crateIndex: number): THREE.Vector3 {
  const shelf = itemShelf(id);
  const spots = crateSpots(crateIndex + 1);
  const spot = spots[crateIndex] ?? { x: 0, y: 1.37, z: 0 };
  return new THREE.Vector3((shelf?.x ?? 0) + spot.x, spot.y, (shelf?.z ?? 0) + spot.z);
}
