import * as THREE from "three";
import type { BuildingType } from "./world";
import { STATIC_BUILDINGS } from "./layout";
import { terrainHeight } from "../utils/terrain";

export interface InteriorDef {
  type: BuildingType;
  enabled: boolean;
  name: string;
  /** Interior clear space [w, h, d] in building-local units */
  size: [number, number, number];
  /** Local position where the interior camera is placed on entry */
  cameraStart: [number, number, number];
  /** Local point the interior camera orbits around */
  cameraLook: [number, number, number];
  cameraYaw: number;
  cameraPitch: number;
  cameraDistance: number;
  /** Local position of the door (focus point while approaching) */
  door: [number, number, number];
  /** Local position of the cinematic approach point (outside the door) */
  approach: [number, number, number];
  flightTime: number;
}

export const INTERIOR_DEFS: Partial<Record<BuildingType, InteriorDef>> = {
  barn: {
    type: "barn",
    enabled: true,
    name: "Granero",
    size: [15.2, 6.4, 10.4],
    cameraStart: [0, 2.2, 3.4],
    cameraLook: [0, 1.6, -1.0],
    cameraYaw: 0,
    cameraPitch: 0.5,
    cameraDistance: 5,
    door: [0, 0, 5.7],
    approach: [0, 0, 11.5],
    flightTime: 1.15,
  },
  warehouse: {
    type: "warehouse",
    enabled: true,
    name: "Almacén",
    size: [13.8, 4.3, 9.6],
    cameraStart: [0, 2.0, 3.0],
    cameraLook: [0, 1.8, -1.2],
    cameraYaw: 0,
    cameraPitch: 0.5,
    cameraDistance: 4.5,
    door: [0, 0, 5.1],
    approach: [0, 0, 9.8],
    flightTime: 1.15,
  },
};

export function hasInterior(type: BuildingType): boolean {
  const def = INTERIOR_DEFS[type];
  return !!def && def.enabled;
}

export function getInteriorDef(type: BuildingType | null): InteriorDef | null {
  if (!type) return null;
  const def = INTERIOR_DEFS[type];
  return def && def.enabled ? def : null;
}

export function getBuildingTypeByUid(uid: string): BuildingType | null {
  const staticB = STATIC_BUILDINGS.find((b) => b.uid === uid);
  return staticB ? staticB.type : null;
}

export interface BuildingTransform {
  position: [number, number, number];
  rotation: number;
  groundY: number;
}

export function getBuildingTransform(uid: string): BuildingTransform | null {
  const staticB = STATIC_BUILDINGS.find((b) => b.uid === uid);
  if (!staticB) return null;
  const groundY = terrainHeight(staticB.position[0], staticB.position[2]);
  return { position: staticB.position, rotation: staticB.rotation, groundY };
}

/** Rotates a building-local offset into world space (yaw about Y, matching R3F group rotation). */
export function localToWorld(uid: string, local: [number, number, number]): THREE.Vector3 | null {
  const t = getBuildingTransform(uid);
  if (!t) return null;
  const yaw = t.rotation;
  const cos = Math.cos(yaw);
  const sin = Math.sin(yaw);
  return new THREE.Vector3(
    t.position[0] + local[0] * cos + local[2] * sin,
    t.groundY + local[1],
    t.position[2] - local[0] * sin + local[2] * cos
  );
}
