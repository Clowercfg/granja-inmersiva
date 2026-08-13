import { create } from "zustand";
import * as THREE from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import { DRACOLoader } from "three/examples/jsm/loaders/DRACOLoader.js";
import { MeshoptDecoder } from "three/examples/jsm/libs/meshopt_decoder.module.js";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";
import { ASSETS, resolveUrl, type AssetDef } from "./assetConfig";

export type AssetStatus = "idle" | "loading" | "loaded" | "missing";

export interface AssetEntry {
  status: AssetStatus;
  object?: THREE.Object3D;
  texture?: THREE.Texture;
}

interface AssetStore {
  entries: Record<string, AssetEntry>;
  ensure: (key: string) => void;
}

const IDLE_ENTRY: AssetEntry = { status: "idle" };
const warned = new Set<string>();

let gltfLoader: GLTFLoader | null = null;
function getLoader(): GLTFLoader {
  if (!gltfLoader) {
    gltfLoader = new GLTFLoader();
    try {
      const draco = new DRACOLoader();
      draco.setDecoderPath(resolveUrl("three/draco/"));
      gltfLoader.setDRACOLoader(draco);
    } catch {
      /* Draco es opcional */
    }
    try {
      gltfLoader.setMeshoptDecoder(MeshoptDecoder);
    } catch {
      /* Meshopt es opcional */
    }
  }
  return gltfLoader;
}

function markLoaded(key: string, entry: AssetEntry): void {
  useAssetStore.setState((s) => ({ entries: { ...s.entries, [key]: entry } }));
}

async function loadGltf(key: string, def: AssetDef): Promise<void> {
  try {
    const gltf = await getLoader().loadAsync(resolveUrl(def.url));
    gltf.scene.traverse((child) => {
      const mesh = child as THREE.Mesh;
      if (mesh.isMesh) {
        mesh.castShadow = true;
        mesh.receiveShadow = true;
      }
    });
    markLoaded(key, { status: "loaded", object: gltf.scene });
  } catch {
    if (!warned.has(key)) {
      warned.add(key);
      console.warn(`[assets] No se encontró ${def.url} → usando placeholder procedural.`);
    }
    markLoaded(key, { status: "missing" });
  }
}

async function loadTexture(key: string, def: AssetDef): Promise<void> {
  try {
    const tex = await new THREE.TextureLoader().loadAsync(resolveUrl(def.url));
    if (def.srgb) tex.colorSpace = THREE.SRGBColorSpace;
    tex.anisotropy = 8;
    tex.wrapS = THREE.RepeatWrapping;
    tex.wrapT = THREE.RepeatWrapping;
    tex.needsUpdate = true;
    markLoaded(key, { status: "loaded", texture: tex });
  } catch {
    if (!warned.has(key)) {
      warned.add(key);
      console.warn(`[assets] No se encontró ${def.url} → usando textura procedural.`);
    }
    markLoaded(key, { status: "missing" });
  }
}

export const useAssetStore = create<AssetStore>((set, get) => ({
  entries: {},
  ensure: (key) => {
    const def = ASSETS[key];
    const entry = get().entries[key];
    if (!def || entry?.status === "loading" || entry?.status === "loaded" || entry?.status === "missing") return;
    set((s) => ({ entries: { ...s.entries, [key]: { status: "loading" } } }));
    if (def.kind === "gltf") void loadGltf(key, def);
    else void loadTexture(key, def);
  },
}));

export const getIdleEntry = (): AssetEntry => IDLE_ENTRY;
export function cloneAsset(entry: AssetEntry | undefined, scale?: [number, number, number]): THREE.Object3D | null {
  if (!entry || entry.status !== "loaded" || !entry.object) return null;
  const clone = entry.object.clone();
  if (scale) clone.scale.set(scale[0], scale[1], scale[2]);
  clone.traverse((child) => {
    const mesh = child as THREE.Mesh;
    if (mesh.isMesh) {
      mesh.castShadow = true;
      mesh.receiveShadow = true;
    }
  });
  return clone;
}

export interface AnimalPartsBase {
  body?: THREE.Object3D;
  head?: THREE.Object3D;
  tail?: THREE.Object3D;
  wings?: THREE.Object3D[];
  legs: THREE.Object3D[];
  phaseOffset: number[];
}

/**
 * Busca nodos animables por nombre convencional (body, head, tail, leg*, wing*).
 * Los nodos ausentes simplemente no se animan.
 */
export function attachAnimalParts(model: THREE.Object3D, _kind: "cow" | "chicken"): AnimalPartsBase {
  const names = new Map<string, THREE.Object3D>();
  const legs: THREE.Object3D[] = [];
  const wings: THREE.Object3D[] = [];
  model.traverse((o) => {
    const n = (o.name ?? "").trim().toLowerCase();
    if (!n) return;
    if (!names.has(n)) names.set(n, o);
    if (n.includes("leg")) legs.push(o);
    else if (n.includes("wing")) wings.push(o);
  });
  legs.sort((a, b) => a.position.x - b.position.x);
  return {
    body: names.get("body"),
    head: names.get("head"),
    tail: names.get("tail"),
    wings,
    legs,
    phaseOffset: legs.map((_, i) => (i % 2 === 0 ? 0 : Math.PI)),
  };
}

/** Clona el modelo del animal y le adjunta los nodos animables. */
export function prepareAnimalModel(entry: AssetEntry | undefined, kind: "cow" | "chicken"): THREE.Object3D | null {
  const clone = cloneAsset(entry);
  if (!clone) return null;
  clone.userData.parts = attachAnimalParts(clone, kind);
  return clone;
}

/** Fusiona todas las geometrías de un modelo en una sola (para instancing). */
export function geometryFromObject(model: THREE.Object3D): THREE.BufferGeometry | null {
  const parts: THREE.BufferGeometry[] = [];
  model.updateMatrixWorld(true);
  model.traverse((child) => {
    const mesh = child as THREE.Mesh;
    if (!mesh.isMesh || !mesh.geometry || !mesh.geometry.attributes.position) return;
    const g = mesh.geometry.clone();
    g.applyMatrix4(mesh.matrixWorld);
    parts.push(g.index ? g.toNonIndexed() : g);
  });
  if (!parts.length) return null;
  const merged = mergeGeometries(parts);
  if (!merged) return null;
  merged.computeVertexNormals();
  return merged;
}

/** Asegura un atributo de color blanco (necesario para instancing con tintado). */
export function ensureWhiteVertexColors(geo: THREE.BufferGeometry): THREE.BufferGeometry {
  if (!geo.getAttribute("color")) {
    const pos = geo.attributes.position;
    const colors = new Float32Array(pos.count * 3).fill(1);
    geo.setAttribute("color", new THREE.BufferAttribute(colors, 3));
  }
  return geo;
}
