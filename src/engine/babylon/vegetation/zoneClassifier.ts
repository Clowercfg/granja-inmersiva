import type { ZoneType } from "./vegetationConfig";
import { VEGETATION_CONFIG } from "./vegetationConfig";
import { distanceToPaths, insideAnyEnclosure, POND, PLOTS } from "../world/terrainMath";

function isInsidePlot(x: number, z: number, margin: number): boolean {
  for (const p of PLOTS) {
    if (Math.abs(x - p.cx) < p.w / 2 + margin && Math.abs(z - p.cz) < p.d / 2 + margin) {
      return true;
    }
  }
  return false;
}

export function classifyZone(x: number, z: number): ZoneType {
  const { farmCoreRadius, forestEdgeRadius } = VEGETATION_CONFIG.zones;
  const distFromCenter = Math.hypot(x, z);
  const distToPond = Math.hypot(x - POND.x, z - POND.z);

  if (distanceToPaths(x, z) < 4.0) return "roads";
  if (isInsidePlot(x, z, 2)) return "fields";
  if (distToPond < POND.radius + 8) return "pond";
  if (insideAnyEnclosure(x, z, 4)) return "pasture";
  if (distFromCenter < farmCoreRadius) return "farmCore";
  if (distFromCenter > forestEdgeRadius) return "forestEdge";
  return "wildArea";
}
