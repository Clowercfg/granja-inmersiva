export type ZoneType =
  | "farmCore"
  | "fields"
  | "roads"
  | "pond"
  | "pasture"
  | "wildArea"
  | "forestEdge";

export interface ZoneDensity {
  trees: number;
  grass: number;
  flowers: number;
  bushes: number;
  rocks: number;
}

export const ZONE_DENSITY: Record<ZoneType, ZoneDensity> = {
  farmCore: { trees: 0.14, grass: 0.14, flowers: 0.08, bushes: 0.1, rocks: 0.07 },
  fields: { trees: 0, grass: 0, flowers: 0, bushes: 0, rocks: 0 },
  roads: { trees: 0, grass: 0, flowers: 0, bushes: 0, rocks: 0 },
  pond: { trees: 0.25, grass: 0.45, flowers: 0.2, bushes: 0.24, rocks: 0.18 },
  pasture: { trees: 0.18, grass: 0.4, flowers: 0.08, bushes: 0.11, rocks: 0.1 },
  wildArea: { trees: 0.5, grass: 0.48, flowers: 0.13, bushes: 0.4, rocks: 0.28 },
  forestEdge: { trees: 0.85, grass: 0.38, flowers: 0.06, bushes: 0.5, rocks: 0.22 },
};

export const VEGETATION_CONFIG = {
  seed: 20260214,

  global: {
    grassMultiplier: 0.38,
    treeMultiplier: 0.8,
    flowerMultiplier: 0.3,
    bushMultiplier: 0.55,
    rockMultiplier: 0.8,
  },

  grass: {
    maxAttempts: 48000,
    outerRadius: 230,
    minSpacing: 0,
    pathMargin: 3.2,
    pondMargin: 3.5,
    enclosureMargin: 2,
    plotMargin: 0.8,
    obstacleMargin: 2,
    slopeLimit: 0.42,
  },

  trees: {
    farmRadius: 100,
    outerRadius: 260,
    farmTarget: 70,
    outerTarget: 95,
    minSpacing: 7.0,
    pathMargin: 3.5,
    pondMargin: 4.5,
    enclosureMargin: 1.5,
    plotMargin: 1.5,
    obstacleMargin: 1.5,
    slopeLimit: 0.5,
    clusterChance: 0.35,
    clusterRadius: 12,
    clusterCount: [3, 7] as [number, number],
  },

  flowers: {
    maxAttempts: 2600,
    outerRadius: 150,
    minSpacing: 0,
    pathMargin: 3.0,
    pondMargin: 2.0,
    enclosureMargin: 1.5,
    plotMargin: 0.5,
    obstacleMargin: 1.5,
  },

  bushes: {
    farmRadius: 60,
    outerRadius: 200,
    farmTarget: 26,
    outerTarget: 75,
    minSpacing: 4.5,
    pathMargin: 3.2,
    pondMargin: 3.5,
    enclosureMargin: 1.5,
    plotMargin: 1.5,
    obstacleMargin: 1.5,
    slopeLimit: 0.5,
  },

  rocks: {
    maxAttempts: 420,
    outerRadius: 250,
    minSpacing: 0,
    pathMargin: 2.5,
    pondMargin: 2.0,
    enclosureMargin: 1.0,
    plotMargin: 0.5,
    obstacleMargin: 1.0,
  },

  zones: {
    farmCoreRadius: 35,
    forestEdgeRadius: 200,
    buildingExclusionBase: 5,
    buildingExclusionScale: 0.4,
  },
} as const;
