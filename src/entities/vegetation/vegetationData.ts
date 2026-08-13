import { POND, PLOTS, distanceToPaths, terrainHeight, terrainNormal } from "../../utils/terrain";
import { makeRng } from "../../utils/math";
import { isNearObstacle } from "../../config/layout";
import { insideAnyEnclosure } from "../../config/enclosures";

export interface VegetationInstance {
  x: number;
  z: number;
  y: number;
  scale: number;
  yaw: number;
  phase: number;
}

let cached: {
  trees: VegetationInstance[];
  grass: VegetationInstance[];
  flowers: VegetationInstance[];
  rocks: VegetationInstance[];
  bushes: VegetationInstance[];
} | null = null;

function scatter(
  rng: () => number,
  farmMax: number,
  outerMax: number,
  farmCount: number,
  outerCount: number,
  minSpacing: number,
  onTreeOnly: boolean
): VegetationInstance[] {
  const placed: Array<[number, number]> = [];
  const out: VegetationInstance[] = [];
  const attempts = (farmCount + outerCount) * 40;

  for (let n = 0; n < attempts && out.length < farmCount + outerCount; n++) {
    const r = Math.sqrt(rng()) * outerMax;
    const a = rng() * Math.PI * 2;
    const x = Math.cos(a) * r;
    const z = Math.sin(a) * r;

    if (r > farmMax && out.length >= farmCount) continue;
    if (r > outerMax) continue;

    if (distanceToPaths(x, z) < 3.4) continue;
    if (POND) {
      if (Math.hypot(x - POND.x, z - POND.z) < POND.radius + 4) continue;
    }
    if (insideAnyEnclosure(x, z, 1.5)) continue;
    if (PLOTS.some((p) => Math.abs(x - p.cx) < p.w / 2 + 1.5 && Math.abs(z - p.cz) < p.d / 2 + 1.5)) continue;
    if (isNearObstacle(x, z, 1.5)) continue;
    const nrm = terrainNormal(x, z, 1.5);
    if (nrm.y < 0.5) continue;
    if (onTreeOnly) {
      let ok = true;
      for (const [px, pz] of placed) {
        if (Math.hypot(x - px, z - pz) < minSpacing) {
          ok = false;
          break;
        }
      }
      if (!ok) continue;
      placed.push([x, z]);
    }
    const isOuter = r > farmMax;
    out.push({
      x,
      z,
      y: terrainHeight(x, z),
      scale: isOuter ? 0.7 + rng() * 0.6 : 0.9 + rng() * 0.9,
      yaw: rng() * Math.PI * 2,
      phase: rng(),
    });
  }
  return out;
}

export function getVegetation() {
  if (cached) return cached;
  const rng = makeRng(20260214);

  const trees = scatter(rng, 100, 260, 95, 130, 6.5, true);

  const grass: VegetationInstance[] = [];
  const grassCount = 48000;
  for (let i = 0; i < grassCount; i++) {
    const r = Math.sqrt(rng()) * 230;
    const a = rng() * Math.PI * 2;
    const x = Math.cos(a) * r;
    const z = Math.sin(a) * r;
    if (distanceToPaths(x, z) < 3.0) continue;
    if (Math.hypot(x - POND.x, z - POND.z) < POND.radius + 3.5) continue;
    if (insideAnyEnclosure(x, z, 2)) continue;
    if (PLOTS.some((p) => Math.abs(x - p.cx) < p.w / 2 + 0.8 && Math.abs(z - p.cz) < p.d / 2 + 0.8)) continue;
    if (isNearObstacle(x, z, 2)) continue;
    const nrm = terrainNormal(x, z, 1.5);
    if (nrm.y < 0.42) continue;
    grass.push({
      x,
      z,
      y: terrainHeight(x, z),
      scale: 0.7 + rng() * 0.9,
      yaw: rng() * Math.PI * 2,
      phase: rng(),
    });
  }

  const flowers: VegetationInstance[] = [];
  const flowerCount = 2600;
  for (let i = 0; i < flowerCount; i++) {
    const r = Math.sqrt(rng()) * 150;
    const a = rng() * Math.PI * 2;
    const x = Math.cos(a) * r;
    const z = Math.sin(a) * r;
    if (distanceToPaths(x, z) < 2.5) continue;
    if (insideAnyEnclosure(x, z, 1.5)) continue;
    if (PLOTS.some((p) => Math.abs(x - p.cx) < p.w / 2 + 0.5 && Math.abs(z - p.cz) < p.d / 2 + 0.5)) continue;
    if (Math.hypot(x - POND.x, z - POND.z) < POND.radius + 2.5) continue;
    if (isNearObstacle(x, z, 1.5)) continue;
    flowers.push({
      x,
      z,
      y: terrainHeight(x, z),
      scale: 0.6 + rng() * 0.7,
      yaw: rng() * Math.PI * 2,
      phase: rng(),
    });
  }

  const rocks: VegetationInstance[] = [];
  const rockCount = 420;
  for (let i = 0; i < rockCount; i++) {
    const r = Math.sqrt(rng()) * 250;
    const a = rng() * Math.PI * 2;
    const x = Math.cos(a) * r;
    const z = Math.sin(a) * r;
    if (distanceToPaths(x, z) < 2.5) continue;
    if (insideAnyEnclosure(x, z, 1)) continue;
    if (PLOTS.some((p) => Math.abs(x - p.cx) < p.w / 2 + 0.5 && Math.abs(z - p.cz) < p.d / 2 + 0.5)) continue;
    if (Math.hypot(x - POND.x, z - POND.z) < POND.radius + 2) continue;
    if (isNearObstacle(x, z, 1)) continue;
    if (r < 10 && rng() < 0.6) continue;
    rocks.push({
      x,
      z,
      y: terrainHeight(x, z),
      scale: 0.35 + rng() * 1.1,
      yaw: rng() * Math.PI * 2,
      phase: rng(),
    });
  }

  const bushes: VegetationInstance[] = scatter(rng, 60, 200, 32, 110, 4.0, true);

  cached = { trees, grass, flowers, rocks, bushes };
  return cached;
}

export function getTreeColliders(): Array<{ x: number; z: number; radius: number }> {
  return getVegetation().trees.map((t) => ({ x: t.x, z: t.z, radius: 0.5 * t.scale }));
}
