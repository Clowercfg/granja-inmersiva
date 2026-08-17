import {
  terrainHeight,
  terrainNormal,
  distanceToPaths,
  insideAnyEnclosure,
  isNearObstacle,
  POND,
  PLOTS,
} from "../world/terrainMath";
import { VEGETATION_CONFIG, type ZoneDensity } from "./vegetationConfig";
import { classifyZone } from "./zoneClassifier";

export interface VegetationInstance {
  x: number;
  z: number;
  y: number;
  scale: number;
  yaw: number;
  phase: number;
  variant: number;
}

function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function zoneDensityFor(
  zone: ReturnType<typeof classifyZone>,
  key: keyof ZoneDensity,
): number {
  const cfg = VEGETATION_CONFIG;
  const zoneCfg = cfg.global;
  const zoneTable = {
    farmCore: { trees: 0.08, grass: 0.10, flowers: 0.04, bushes: 0.05, rocks: 0.05 },
    fields: { trees: 0, grass: 0, flowers: 0, bushes: 0, rocks: 0 },
    roads: { trees: 0, grass: 0, flowers: 0, bushes: 0, rocks: 0 },
    pond: { trees: 0.20, grass: 0.40, flowers: 0.15, bushes: 0.20, rocks: 0.15 },
    pasture: { trees: 0.12, grass: 0.35, flowers: 0.05, bushes: 0.08, rocks: 0.08 },
    wildArea: { trees: 0.45, grass: 0.45, flowers: 0.10, bushes: 0.35, rocks: 0.25 },
    forestEdge: { trees: 0.80, grass: 0.35, flowers: 0.05, bushes: 0.45, rocks: 0.20 },
  } as const;

  const globalMul =
    key === "trees" ? zoneCfg.treeMultiplier :
    key === "grass" ? zoneCfg.grassMultiplier :
    key === "flowers" ? zoneCfg.flowerMultiplier :
    key === "bushes" ? zoneCfg.bushMultiplier :
    zoneCfg.rockMultiplier;

  return zoneTable[zone][key] * globalMul;
}

function scatterTrees(
  rng: () => number,
): VegetationInstance[] {
  const cfg = VEGETATION_CONFIG.trees;
  const totalTarget = cfg.farmTarget + cfg.outerTarget;
  const out: VegetationInstance[] = [];

  const attempts = totalTarget * 50;

  for (let n = 0; n < attempts && out.length < totalTarget; n++) {
    const r = Math.sqrt(rng()) * cfg.outerRadius;
    const a = rng() * Math.PI * 2;
    const x = Math.cos(a) * r;
    const z = Math.sin(a) * r;

    if (r > cfg.farmRadius && out.length >= cfg.farmTarget) continue;
    if (r > cfg.outerRadius) continue;

    if (distanceToPaths(x, z) < cfg.pathMargin) continue;
    if (Math.hypot(x - POND.x, z - POND.z) < POND.radius + cfg.pondMargin) continue;
    if (insideAnyEnclosure(x, z, cfg.enclosureMargin)) continue;
    if (PLOTS.some((p) => Math.abs(x - p.cx) < p.w / 2 + cfg.plotMargin && Math.abs(z - p.cz) < p.d / 2 + cfg.plotMargin)) continue;
    if (isNearObstacle(x, z, cfg.obstacleMargin)) continue;

    const nrm = terrainNormal(x, z, 1.5);
    if (nrm.y < cfg.slopeLimit) continue;

    const zone = classifyZone(x, z);
    const density = zoneDensityFor(zone, "trees");
    if (rng() > density) continue;

    if (cfg.minSpacing > 0) {
      let ok = true;
      for (const existing of out) {
        if (Math.hypot(x - existing.x, z - existing.z) < cfg.minSpacing) {
          ok = false;
          break;
        }
      }
      if (!ok) continue;
    }

    const isOuter = r > cfg.farmRadius;
    const variant = Math.floor(rng() * 6);
    out.push({
      x,
      z,
      y: terrainHeight(x, z),
      scale: isOuter ? 0.7 + rng() * 0.6 : 0.9 + rng() * 0.9,
      yaw: rng() * Math.PI * 2,
      phase: rng(),
      variant,
    });

    if (rng() < cfg.clusterChance) {
      const count = cfg.clusterCount[0] + Math.floor(rng() * (cfg.clusterCount[1] - cfg.clusterCount[0]));
      for (let c = 0; c < count && out.length < totalTarget; c++) {
        const ca = rng() * Math.PI * 2;
        const cr = rng() * cfg.clusterRadius;
        const cx = x + Math.cos(ca) * cr;
        const cz = z + Math.sin(ca) * cr;

        if (distanceToPaths(cx, cz) < cfg.pathMargin) continue;
        if (Math.hypot(cx - POND.x, cz - POND.z) < POND.radius + cfg.pondMargin) continue;
        if (insideAnyEnclosure(cx, cz, cfg.enclosureMargin)) continue;
        if (PLOTS.some((p) => Math.abs(cx - p.cx) < p.w / 2 + cfg.plotMargin && Math.abs(cz - p.cz) < p.d / 2 + cfg.plotMargin)) continue;
        if (isNearObstacle(cx, cz, cfg.obstacleMargin)) continue;

        const cnrm = terrainNormal(cx, cz, 1.5);
        if (cnrm.y < cfg.slopeLimit) continue;

        const czone = classifyZone(cx, cz);
        const cdensity = zoneDensityFor(czone, "trees");
        if (rng() > cdensity) continue;

        let ok = true;
        for (const existing of out) {
          if (Math.hypot(cx - existing.x, cz - existing.z) < cfg.minSpacing) {
            ok = false;
            break;
          }
        }
        if (!ok) continue;

        const isOuterC = Math.hypot(cx, cz) > cfg.farmRadius;
        out.push({
          x: cx,
          z: cz,
          y: terrainHeight(cx, cz),
          scale: isOuterC ? 0.7 + rng() * 0.6 : 0.9 + rng() * 0.9,
          yaw: rng() * Math.PI * 2,
          phase: rng(),
          variant: Math.floor(rng() * 6),
        });
      }
    }
  }

  return out;
}

function scatterGrass(
  rng: () => number,
): VegetationInstance[] {
  const cfg = VEGETATION_CONFIG.grass;
  const out: VegetationInstance[] = [];

  for (let i = 0; i < cfg.maxAttempts; i++) {
    const r = Math.sqrt(rng()) * cfg.outerRadius;
    const a = rng() * Math.PI * 2;
    const x = Math.cos(a) * r;
    const z = Math.sin(a) * r;

    if (distanceToPaths(x, z) < cfg.pathMargin) continue;
    if (Math.hypot(x - POND.x, z - POND.z) < POND.radius + cfg.pondMargin) continue;
    if (insideAnyEnclosure(x, z, cfg.enclosureMargin)) continue;
    if (PLOTS.some((p) => Math.abs(x - p.cx) < p.w / 2 + cfg.plotMargin && Math.abs(z - p.cz) < p.d / 2 + cfg.plotMargin)) continue;
    if (isNearObstacle(x, z, cfg.obstacleMargin)) continue;

    const nrm = terrainNormal(x, z, 1.5);
    if (nrm.y < cfg.slopeLimit) continue;

    const zone = classifyZone(x, z);
    const density = zoneDensityFor(zone, "grass");
    if (rng() > density) continue;

    out.push({
      x,
      z,
      y: terrainHeight(x, z),
      scale: 0.7 + rng() * 0.9,
      yaw: rng() * Math.PI * 2,
      phase: rng(),
      variant: 0,
    });
  }

  return out;
}

function scatterFlowers(
  rng: () => number,
): VegetationInstance[] {
  const cfg = VEGETATION_CONFIG.flowers;
  const out: VegetationInstance[] = [];

  for (let i = 0; i < cfg.maxAttempts; i++) {
    const r = Math.sqrt(rng()) * cfg.outerRadius;
    const a = rng() * Math.PI * 2;
    const x = Math.cos(a) * r;
    const z = Math.sin(a) * r;

    if (distanceToPaths(x, z) < cfg.pathMargin) continue;
    if (insideAnyEnclosure(x, z, cfg.enclosureMargin)) continue;
    if (PLOTS.some((p) => Math.abs(x - p.cx) < p.w / 2 + cfg.plotMargin && Math.abs(z - p.cz) < p.d / 2 + cfg.plotMargin)) continue;
    if (Math.hypot(x - POND.x, z - POND.z) < POND.radius + cfg.pondMargin) continue;
    if (isNearObstacle(x, z, cfg.obstacleMargin)) continue;

    const zone = classifyZone(x, z);
    const density = zoneDensityFor(zone, "flowers");
    if (rng() > density) continue;

    out.push({
      x,
      z,
      y: terrainHeight(x, z),
      scale: 0.6 + rng() * 0.7,
      yaw: rng() * Math.PI * 2,
      phase: rng(),
      variant: Math.floor(rng() * 3),
    });
  }

  return out;
}

function scatterRocks(
  rng: () => number,
): VegetationInstance[] {
  const cfg = VEGETATION_CONFIG.rocks;
  const out: VegetationInstance[] = [];

  for (let i = 0; i < cfg.maxAttempts; i++) {
    const r = Math.sqrt(rng()) * cfg.outerRadius;
    const a = rng() * Math.PI * 2;
    const x = Math.cos(a) * r;
    const z = Math.sin(a) * r;

    if (distanceToPaths(x, z) < cfg.pathMargin) continue;
    if (insideAnyEnclosure(x, z, cfg.enclosureMargin)) continue;
    if (PLOTS.some((p) => Math.abs(x - p.cx) < p.w / 2 + cfg.plotMargin && Math.abs(z - p.cz) < p.d / 2 + cfg.plotMargin)) continue;
    if (Math.hypot(x - POND.x, z - POND.z) < POND.radius + cfg.pondMargin) continue;
    if (isNearObstacle(x, z, cfg.obstacleMargin)) continue;

    if (r < 10 && rng() < 0.6) continue;

    const zone = classifyZone(x, z);
    const density = zoneDensityFor(zone, "rocks");
    if (rng() > density) continue;

    out.push({
      x,
      z,
      y: terrainHeight(x, z),
      scale: 0.35 + rng() * 1.1,
      yaw: rng() * Math.PI * 2,
      phase: rng(),
      variant: Math.floor(rng() * 3),
    });
  }

  return out;
}

function scatterBushes(
  rng: () => number,
): VegetationInstance[] {
  const cfg = VEGETATION_CONFIG.bushes;
  const totalTarget = cfg.farmTarget + cfg.outerTarget;
  const out: VegetationInstance[] = [];
  const placed: Array<[number, number]> = [];

  const attempts = totalTarget * 50;

  for (let n = 0; n < attempts && out.length < totalTarget; n++) {
    const r = Math.sqrt(rng()) * cfg.outerRadius;
    const a = rng() * Math.PI * 2;
    const x = Math.cos(a) * r;
    const z = Math.sin(a) * r;

    if (r > cfg.farmRadius && out.length >= cfg.farmTarget) continue;
    if (r > cfg.outerRadius) continue;

    if (distanceToPaths(x, z) < cfg.pathMargin) continue;
    if (Math.hypot(x - POND.x, z - POND.z) < POND.radius + cfg.pondMargin) continue;
    if (insideAnyEnclosure(x, z, cfg.enclosureMargin)) continue;
    if (PLOTS.some((p) => Math.abs(x - p.cx) < p.w / 2 + cfg.plotMargin && Math.abs(z - p.cz) < p.d / 2 + cfg.plotMargin)) continue;
    if (isNearObstacle(x, z, cfg.obstacleMargin)) continue;

    const nrm = terrainNormal(x, z, 1.5);
    if (nrm.y < cfg.slopeLimit) continue;

    const zone = classifyZone(x, z);
    const density = zoneDensityFor(zone, "bushes");
    if (rng() > density) continue;

    if (cfg.minSpacing > 0) {
      let ok = true;
      for (const [px, pz] of placed) {
        if (Math.hypot(x - px, z - pz) < cfg.minSpacing) {
          ok = false;
          break;
        }
      }
      if (!ok) continue;
      placed.push([x, z]);
    }

    const isOuter = r > cfg.farmRadius;
    out.push({
      x,
      z,
      y: terrainHeight(x, z),
      scale: isOuter ? 0.7 + rng() * 0.6 : 0.9 + rng() * 0.9,
      yaw: rng() * Math.PI * 2,
      phase: rng(),
      variant: Math.floor(rng() * 3),
    });
  }

  return out;
}

let _cachedData: {
  trees: VegetationInstance[];
  grass: VegetationInstance[];
  flowers: VegetationInstance[];
  rocks: VegetationInstance[];
  bushes: VegetationInstance[];
} | null = null;

export function generateVegetationData(): {
  trees: VegetationInstance[];
  grass: VegetationInstance[];
  flowers: VegetationInstance[];
  rocks: VegetationInstance[];
  bushes: VegetationInstance[];
} {
  if (_cachedData) return _cachedData;

  const rng = mulberry32(VEGETATION_CONFIG.seed);

  const trees = scatterTrees(rng);
  const grass = scatterGrass(rng);
  const flowers = scatterFlowers(rng);
  const rocks = scatterRocks(rng);
  const bushes = scatterBushes(rng);

  console.log(`[VEGETATION] Trees: ${trees.length} | Grass: ${grass.length} | Flowers: ${flowers.length} | Rocks: ${rocks.length} | Bushes: ${bushes.length}`);

  _cachedData = { trees, grass, flowers, rocks, bushes };
  return _cachedData;
}
