import type { BuildingType } from "./world";

export interface StaticBuilding {
  uid: string;
  type: BuildingType;
  position: [number, number, number];
  rotation: number;
  level: number;
}

export interface Obstacle {
  x: number;
  z: number;
  radius: number;
}

export const STATIC_BUILDINGS: StaticBuilding[] = [
  { uid: "barn-1", type: "barn", position: [24, 0, 12], rotation: -Math.PI / 2, level: 2 },
  { uid: "house-1", type: "house", position: [-10, 0, 10], rotation: 0.35, level: 1 },
  { uid: "warehouse-1", type: "warehouse", position: [-30, 0, 30], rotation: 0.6, level: 1 },
  { uid: "greenhouse-1", type: "greenhouse", position: [24, 0, -14], rotation: 0, level: 1 },
  { uid: "workshop-1", type: "workshop", position: [-34, 0, -4], rotation: -0.5, level: 1 },
];

export const POND = { x: -44, z: -32, radius: 11.5 } as const;

export const FENCE_SEGMENTS: Array<[number, number, number]> = [
  [-26, -6, 0],
  [-32, -12, 0],
  [-38, -18, 0],
  [-30, -22, Math.PI / 2],
  [-22, -28, Math.PI / 2],
  [-14, -22, 0],
  [-8, -16, 0],
];

export const OBSTACLES: Obstacle[] = STATIC_BUILDINGS.map((b) => {
  const radii: Record<BuildingType, number> = {
    barn: 12,
    house: 8,
    cowPen: 18,
    chickenPen: 11,
    warehouse: 9,
    greenhouse: 8,
    workshop: 7,
  };
  return { x: b.position[0], z: b.position[2], radius: radii[b.type] };
}).concat([{ x: POND.x, z: POND.z, radius: POND.radius }]);

export function isNearObstacle(x: number, z: number, margin = 0): boolean {
  for (const o of OBSTACLES) {
    if (Math.hypot(x - o.x, z - o.z) < o.radius + margin) return true;
  }
  return false;
}

export const BUILDING_LABEL: Record<BuildingType, string> = {
  barn: "Granero",
  house: "Casa principal",
  cowPen: "Corral de vacas",
  chickenPen: "Corral de pollos",
  warehouse: "Almacén",
  greenhouse: "Invernadero",
  workshop: "Taller",
};
