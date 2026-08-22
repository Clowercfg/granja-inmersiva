export type AssetKind = "gltf" | "texture";

export type AssetPriority = 1 | 2 | 3 | 4 | 5;

export interface AssetDef {
  url: string;
  kind: AssetKind;
  srgb?: boolean;
  priority: AssetPriority;
}

/**
 * Registro central de assets 3D. Cada clave puede consultarse con useAsset(key).
 * Los assets se cargan por prioridad:
 *   1 = crítico (terrain, camera)
 *   2 = importante (cercanía)
 *   3 = normal (cultivos, animales)
 *   4 = bajo (vegetación lejana)
 *   5 = decoración (flores, props secundarios)
 */
export const ASSETS: Record<string, AssetDef> = {
  "animal:cow":   { url: "assets/3d/animals/cow.glb",     kind: "gltf", priority: 3 },
  "animal:pig":   { url: "assets/3d/animals/pig.glb",     kind: "gltf", priority: 3 },
  "animal:sheep": { url: "assets/3d/animals/sheep.glb",   kind: "gltf", priority: 3 },
  "animal:horse": { url: "assets/3d/animals/horse.glb",   kind: "gltf", priority: 4 },
  "animal:zebra": { url: "assets/3d/animals/zebra.glb",   kind: "gltf", priority: 4 },
  "animal:llama": { url: "assets/3d/animals/llama.glb",   kind: "gltf", priority: 4 },
  "animal:pug":   { url: "assets/3d/animals/pug.glb",     kind: "gltf", priority: 4 },

  fence:          { url: "assets/3d/environment/fence_planks.glb",  kind: "gltf", priority: 2 },
  "fence-gate":   { url: "assets/3d/environment/fence_gate.glb",    kind: "gltf", priority: 2 },
  "pen-rail":     { url: "assets/3d/environment/fence_simple.glb",  kind: "gltf", priority: 2 },

  "tree:default": { url: "assets/3d/vegetation/trees/tree_default.glb", kind: "gltf", priority: 4 },
  "tree:cone":    { url: "assets/3d/vegetation/trees/tree_cone.glb",    kind: "gltf", priority: 4 },
  "tree:plateau": { url: "assets/3d/vegetation/trees/tree_plateau.glb", kind: "gltf", priority: 4 },
  "tree:q1":      { url: "assets/3d/vegetation/trees/tree_q1.glb",      kind: "gltf", priority: 4 },
  "tree:q2":      { url: "assets/3d/vegetation/trees/tree_q2.glb",      kind: "gltf", priority: 4 },
  "tree:q3":      { url: "assets/3d/vegetation/trees/tree_q3.glb",      kind: "gltf", priority: 4 },

  "bush:kenney":        { url: "assets/3d/vegetation/bushes/bush_kenney.glb",        kind: "gltf", priority: 4 },
  "bush:kenneyLarge":   { url: "assets/3d/vegetation/bushes/bush_kenneyLarge.glb",   kind: "gltf", priority: 4 },
  "bush:kenneySmall":   { url: "assets/3d/vegetation/bushes/bush_kenneySmall.glb",   kind: "gltf", priority: 4 },
  "bush:q1":            { url: "assets/3d/vegetation/bushes/bush_q1.glb",            kind: "gltf", priority: 4 },
  "bush:q2":            { url: "assets/3d/vegetation/bushes/bush_q2.glb",            kind: "gltf", priority: 4 },

  "flower:red":    { url: "assets/3d/vegetation/flowers/flower_red.glb",    kind: "gltf", priority: 5 },
  "flower:yellow": { url: "assets/3d/vegetation/flowers/flower_yellow.glb", kind: "gltf", priority: 5 },
  "flower:purple": { url: "assets/3d/vegetation/flowers/flower_purple.glb", kind: "gltf", priority: 5 },

  "rock:largeA": { url: "assets/3d/vegetation/rocks/rock_largeA.glb", kind: "gltf", priority: 4 },
  "rock:smallA": { url: "assets/3d/vegetation/rocks/rock_smallA.glb", kind: "gltf", priority: 4 },
  "rock:smallB": { url: "assets/3d/vegetation/rocks/rock_smallB.glb", kind: "gltf", priority: 4 },
  "rock:smallC": { url: "assets/3d/vegetation/rocks/rock_smallC.glb", kind: "gltf", priority: 4 },
  "rock:q1":     { url: "assets/3d/vegetation/rocks/rock_q1.glb",     kind: "gltf", priority: 4 },

  "crop:wheat": { url: "assets/3d/crops/wheat.glb",  kind: "gltf", priority: 3 },
  "crop:corn":  { url: "assets/3d/crops/corn.glb",   kind: "gltf", priority: 3 },
  "crop:carrot": { url: "assets/3d/crops/carrot.glb", kind: "gltf", priority: 3 },

  "prop:lily":     { url: "assets/3d/props/lily_small.glb", kind: "gltf", priority: 5 },
  "prop:logStack": { url: "assets/3d/props/log_stack.glb",  kind: "gltf", priority: 5 },
  "prop:stump":    { url: "assets/3d/props/stump_round.glb", kind: "gltf", priority: 5 },
  "prop:sign":     { url: "assets/3d/props/sign.glb",       kind: "gltf", priority: 5 },
};

export function resolveUrl(path: string): string {
  const r2Url = import.meta.env.VITE_R2_PUBLIC_URL;
  if (r2Url) {
    const r2Path = path.replace(/^assets\//, "");
    return r2Url.replace(/\/$/, "") + "/" + r2Path;
  }
  const base = import.meta.env.BASE_URL;
  const prefix = base.endsWith("/") ? base : base + "/";
  return prefix + path;
}

export const ASSET_KEYS_BY_PRIORITY: Record<AssetPriority, string[]> = (() => {
  const result: Record<number, string[]> = { 1: [], 2: [], 3: [], 4: [], 5: [] };
  for (const [key, def] of Object.entries(ASSETS)) {
    result[def.priority].push(key);
  }
  return result as Record<AssetPriority, string[]>;
})();
