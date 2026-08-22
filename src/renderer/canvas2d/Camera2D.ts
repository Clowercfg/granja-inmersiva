import { PLOTS } from "../../utils/terrainMath";
import { ENCLOSURES } from "../../config/enclosures";
import { STATIC_BUILDINGS } from "../../config/layout";
import { BUILDING_CONFIG } from "../../config/world";
import { POND } from "../../utils/terrainMath";

export interface CameraState {
  x: number;
  z: number;
  zoom: number;
}

const ZOOM_MIN = 0.3;
const ZOOM_MAX = 3.0;
const ZOOM_DEFAULT = 1.0;

export function createCamera(): CameraState {
  return { x: 0, z: 0, zoom: ZOOM_DEFAULT };
}

export function worldToScreen(
  wx: number,
  wz: number,
  cam: CameraState,
  canvasW: number,
  canvasH: number
): [number, number] {
  const cos30 = 0.866;
  const sin30 = 0.5;
  const sx = (wx - wz) * cos30 * cam.zoom;
  const sy = (wx + wz) * sin30 * cam.zoom;
  return [sx + canvasW / 2 - cam.x * cam.zoom, sy + canvasH / 2 - cam.z * cam.zoom];
}

export function screenToWorld(
  sx: number,
  sz: number,
  cam: CameraState,
  canvasW: number,
  canvasH: number
): [number, number] {
  const cos30 = 0.866;
  const sin30 = 0.5;
  const rx = sx - canvasW / 2 + cam.x * cam.zoom;
  const rz = sz - canvasH / 2 + cam.z * cam.zoom;
  const wx = (rx / cos30 + rz / sin30) / 2 / cam.zoom;
  const wz = (rz / sin30 - rx / cos30) / 2 / cam.zoom;
  return [wx, wz];
}

export function centerOnFarm(cam: CameraState): void {
  cam.x = 0;
  cam.z = 0;
  cam.zoom = ZOOM_DEFAULT;
}

export function zoomBy(cam: CameraState, delta: number): void {
  cam.zoom = Math.max(ZOOM_MIN, Math.min(ZOOM_MAX, cam.zoom * (1 - delta * 0.001)));
}

export function panBy(cam: CameraState, dx: number, dz: number): void {
  cam.x -= dx / cam.zoom;
  cam.z -= dz / cam.zoom;
}

export function getWorldBounds(): { minX: number; maxX: number; minZ: number; maxZ: number } {
  let minX = Infinity, maxX = -Infinity, minZ = Infinity, maxZ = -Infinity;
  for (const p of PLOTS) {
    minX = Math.min(minX, p.cx - p.w / 2);
    maxX = Math.max(maxX, p.cx + p.w / 2);
    minZ = Math.min(minZ, p.cz - p.d / 2);
    maxZ = Math.max(maxZ, p.cz + p.d / 2);
  }
  for (const e of ENCLOSURES) {
    minX = Math.min(minX, e.bounds.minX);
    maxX = Math.max(maxX, e.bounds.maxX);
    minZ = Math.min(minZ, e.bounds.minZ);
    maxZ = Math.max(maxZ, e.bounds.maxZ);
  }
  for (const b of STATIC_BUILDINGS) {
    const size = BUILDING_CONFIG[b.type].size;
    minX = Math.min(minX, b.position[0] - size[0] / 2);
    maxX = Math.max(maxX, b.position[0] + size[0] / 2);
    minZ = Math.min(minZ, b.position[2] - size[1] / 2);
    maxZ = Math.max(maxZ, b.position[2] + size[1] / 2);
  }
  minX = Math.min(minX, POND.x - POND.radius);
  maxX = Math.max(maxX, POND.x + POND.radius);
  minZ = Math.min(minZ, POND.z - POND.radius);
  maxZ = Math.max(maxZ, POND.z + POND.radius);
  return { minX: minX - 20, maxX: maxX + 20, minZ: minZ - 20, maxZ: maxZ + 20 };
}
