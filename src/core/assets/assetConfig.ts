export type AssetKind = "gltf" | "texture";

export interface AssetDef {
  /** Ruta relativa a la raíz pública (public/assets/...). */
  url: string;
  kind: AssetKind;
  /** sRGB solo para texturas de color. */
  srgb?: boolean;
}

/**
 * Registro central de assets 3D. Cada clave puede consultarse con useAsset(key).
 * Si un asset no está registrado o no se encuentra en disco, los componentes
 * usan su fallback procedural automáticamente (sin errores en red).
 *
 * Todos los modelos provienen de packs CC0 — ver ASSETS_LICENSES.md.
 */
export const ASSETS: Record<string, AssetDef> = {
  // Animales (Quaternius Farm Animal Pack).
  // "animal:chicken" no existe en los packs → el pollo usa fallback procedural.
  "animal:cow": { url: "assets/3d/animals/cow.glb", kind: "gltf" },
  "animal:pig": { url: "assets/3d/animals/pig.glb", kind: "gltf" },
  "animal:sheep": { url: "assets/3d/animals/sheep.glb", kind: "gltf" },
  "animal:horse": { url: "assets/3d/animals/horse.glb", kind: "gltf" },
  "animal:zebra": { url: "assets/3d/animals/zebra.glb", kind: "gltf" },
  "animal:llama": { url: "assets/3d/animals/llama.glb", kind: "gltf" },
  "animal:pug": { url: "assets/3d/animals/pug.glb", kind: "gltf" },

  // Cercas y puertas (Kenney Nature Kit).
  fence: { url: "assets/3d/environment/fence_planks.glb", kind: "gltf" },
  "fence-gate": { url: "assets/3d/environment/fence_gate.glb", kind: "gltf" },
  "pen-rail": { url: "assets/3d/environment/fence_simple.glb", kind: "gltf" },

  // Árboles (Kenney Nature Kit + Quaternius Simple Nature).
  "tree:default": { url: "assets/3d/vegetation/trees/tree_default.glb", kind: "gltf" },
  "tree:cone": { url: "assets/3d/vegetation/trees/tree_cone.glb", kind: "gltf" },
  "tree:plateau": { url: "assets/3d/vegetation/trees/tree_plateau.glb", kind: "gltf" },
  "tree:q1": { url: "assets/3d/vegetation/trees/tree_q1.glb", kind: "gltf" },
  "tree:q2": { url: "assets/3d/vegetation/trees/tree_q2.glb", kind: "gltf" },
  "tree:q3": { url: "assets/3d/vegetation/trees/tree_q3.glb", kind: "gltf" },

  // Arbustos (Kenney Nature Kit + Quaternius Simple Nature).
  "bush:kenney": { url: "assets/3d/vegetation/bushes/bush_kenney.glb", kind: "gltf" },
  "bush:kenneyLarge": { url: "assets/3d/vegetation/bushes/bush_kenneyLarge.glb", kind: "gltf" },
  "bush:kenneySmall": { url: "assets/3d/vegetation/bushes/bush_kenneySmall.glb", kind: "gltf" },
  "bush:q1": { url: "assets/3d/vegetation/bushes/bush_q1.glb", kind: "gltf" },
  "bush:q2": { url: "assets/3d/vegetation/bushes/bush_q2.glb", kind: "gltf" },

  // Flores (Kenney Nature Kit).
  "flower:red": { url: "assets/3d/vegetation/flowers/flower_red.glb", kind: "gltf" },
  "flower:yellow": { url: "assets/3d/vegetation/flowers/flower_yellow.glb", kind: "gltf" },
  "flower:purple": { url: "assets/3d/vegetation/flowers/flower_purple.glb", kind: "gltf" },

  // Rocas (Kenney Nature Kit + Quaternius Simple Nature).
  "rock:largeA": { url: "assets/3d/vegetation/rocks/rock_largeA.glb", kind: "gltf" },
  "rock:smallA": { url: "assets/3d/vegetation/rocks/rock_smallA.glb", kind: "gltf" },
  "rock:smallB": { url: "assets/3d/vegetation/rocks/rock_smallB.glb", kind: "gltf" },
  "rock:smallC": { url: "assets/3d/vegetation/rocks/rock_smallC.glb", kind: "gltf" },
  "rock:q1": { url: "assets/3d/vegetation/rocks/rock_q1.glb", kind: "gltf" },

  // Cultivos (Kenney Nature Kit).
  "crop:wheat": { url: "assets/3d/crops/wheat.glb", kind: "gltf" },
  "crop:corn": { url: "assets/3d/crops/corn.glb", kind: "gltf" },
  "crop:carrot": { url: "assets/3d/crops/carrot.glb", kind: "gltf" },

  // Props decorativos (Kenney Nature Kit).
  "prop:lily": { url: "assets/3d/props/lily_small.glb", kind: "gltf" },
  "prop:logStack": { url: "assets/3d/props/log_stack.glb", kind: "gltf" },
  "prop:stump": { url: "assets/3d/props/stump_round.glb", kind: "gltf" },
  "prop:sign": { url: "assets/3d/props/sign.glb", kind: "gltf" },
};

/**
 * Resolves asset URL. Uses R2 public URL in production, local paths in dev.
 * Set VITE_R2_PUBLIC_URL env var for production R2 bucket.
 */
export function resolveUrl(path: string): string {
  // In production, use R2 bucket URL
  const r2Url = import.meta.env.VITE_R2_PUBLIC_URL;
  if (r2Url) {
    // path is like "assets/3d/animals/cow.glb" → strip "assets/" prefix for R2
    const r2Path = path.replace(/^assets\//, "");
    return r2Url.replace(/\/$/, "") + "/" + r2Path;
  }
  // In development, use local paths
  const base = import.meta.env.BASE_URL;
  const prefix = base.endsWith("/") ? base : base + "/";
  return prefix + path;
}
