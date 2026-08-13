export type AssetKind = "gltf" | "texture";

export interface AssetDef {
  /** Ruta relativa a la raíz pública (public/assets/...). */
  url: string;
  kind: AssetKind;
  /** sRGB solo para texturas de color. */
  srgb?: boolean;
}

export const ASSETS: Record<string, AssetDef> = {
  "building:barn": { url: "assets/buildings/barn.glb", kind: "gltf" },
  "building:house": { url: "assets/buildings/house.glb", kind: "gltf" },
  "building:warehouse": { url: "assets/buildings/warehouse.glb", kind: "gltf" },
  "building:greenhouse": { url: "assets/buildings/greenhouse.glb", kind: "gltf" },
  "building:workshop": { url: "assets/buildings/workshop.glb", kind: "gltf" },
  fence: { url: "assets/buildings/fence.glb", kind: "gltf" },
  "fence-gate": { url: "assets/buildings/gate.glb", kind: "gltf" },
  "pen-rail": { url: "assets/buildings/pen-rail.glb", kind: "gltf" },
  "animal:cow": { url: "assets/animals/cow.glb", kind: "gltf" },
  "animal:chicken": { url: "assets/animals/chicken.glb", kind: "gltf" },
  tree: { url: "assets/trees/tree.glb", kind: "gltf" },
  "crop:wheat": { url: "assets/crops/wheat.glb", kind: "gltf" },
  "crop:corn": { url: "assets/crops/corn.glb", kind: "gltf" },
  "crop:carrot": { url: "assets/crops/carrot.glb", kind: "gltf" },
  "crop:tomato": { url: "assets/crops/tomato.glb", kind: "gltf" },
  "terrain-color": { url: "assets/terrain/color-map.jpg", kind: "texture", srgb: true },
  "terrain-normal": { url: "assets/terrain/normal-map.jpg", kind: "texture" },
};

/** Resuelve una ruta pública respetando el base de Vite (./ en build, / en dev). */
export function resolveUrl(path: string): string {
  const base = import.meta.env.BASE_URL;
  const prefix = base.endsWith("/") ? base : base + "/";
  return prefix + path;
}
