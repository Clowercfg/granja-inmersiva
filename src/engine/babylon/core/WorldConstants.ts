import { Vector3 } from "@babylonjs/core";
import { WORLD, CAMERA, WEATHER, type WeatherKind } from "../../../config/world";
import {
  terrainHeight as _terrainHeight,
  terrainNormal as _terrainNormal,
  distanceToPaths as _distanceToPaths,
  PLOTS,
  POND,
  PATHS,
  PATH_WIDTH,
  WATER_Y,
  ENCLOSURES,
  type PlotRect,
} from "../world/terrainMath";
import {
  ENCLOSURE_BY_KIND,
  getEnclosureFences,
  getGatePositions,
  type EnclosureDef,
  type Bounds,
  type FenceSeg,
} from "../../../config/enclosures";
import {
  STATIC_BUILDINGS,
  OBSTACLES,
  FENCE_SEGMENTS,
  type StaticBuilding,
  type Obstacle,
} from "../../../config/layout";

export { PLOTS, POND, PATHS, PATH_WIDTH, WATER_Y, ENCLOSURES, ENCLOSURE_BY_KIND };
export type { PlotRect, EnclosureDef, Bounds, FenceSeg, StaticBuilding, Obstacle };

export const BABYLON_WORLD = {
  size: WORLD.size,
  half: WORLD.half,
  farmRadius: WORLD.farmRadius,
  edgeFalloff: WORLD.edgeFalloff,
  terrainHeightScale: WORLD.terrainHeightScale,
  maxTerrainHeight: WORLD.maxTerrainHeight,
} as const;

export const BABYLON_CAMERA = {
  pitchMin: CAMERA.pitchMin,
  pitchMax: CAMERA.pitchMax,
  pitchDefault: CAMERA.pitchDefault,
  distanceMin: CAMERA.distanceMin,
  distanceMax: CAMERA.distanceMax,
  distanceDefault: CAMERA.distanceDefault,
  panSpeed: CAMERA.panSpeed,
  panSpeedBoost: CAMERA.panSpeedBoost,
  rotateSpeed: CAMERA.rotateSpeed,
  zoomSpeed: CAMERA.zoomSpeed,
  damping: CAMERA.damping,
  minHeightAboveTerrain: CAMERA.minHeightAboveTerrain,
} as const;

export function terrainHeight(x: number, z: number): number {
  return _terrainHeight(x, z);
}

export function terrainNormal(x: number, z: number, eps?: number): Vector3 {
  const v = _terrainNormal(x, z, eps);
  return new Vector3(v.x, v.y, v.z);
}

export function distanceToPaths(x: number, z: number): number {
  return _distanceToPaths(x, z);
}

export function getWeatherValues(kind: WeatherKind) {
  return WEATHER[kind];
}

export { getEnclosureFences, getGatePositions };

export const FARM_BUILDINGS = STATIC_BUILDINGS;
export const FARM_OBSTACLES = OBSTACLES;
export const FARM_FENCE_SEGMENTS = FENCE_SEGMENTS;
