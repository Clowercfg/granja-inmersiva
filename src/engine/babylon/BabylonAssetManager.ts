import { Scene, AbstractMesh, Mesh } from "@babylonjs/core";
import { SceneLoader } from "@babylonjs/core";

/**
 * AssetManager para cargar y cachear modelos GLB/GLTF.
 * Reutiliza modelos ya cargados para evitar duplicar en memoria.
 */
export class BabylonAssetManager {
  private _cache = new Map<string, AbstractMesh[]>();
  private _scene: Scene;

  constructor(scene: Scene) {
    this._scene = scene;
  }

  /**
   * Carga un modelo GLB/GLTF. Si ya fue cargado, clona las mallas.
   */
  async loadModel(url: string, name?: string): Promise<AbstractMesh[]> {
    if (this._cache.has(url)) {
      const originals = this._cache.get(url)!;
      return originals.map((m, i) => {
        const clone = m.clone(`${name ?? "model"}_clone_${i}`, m.parent);
        return clone!;
      });
    }

    const result = await SceneLoader.ImportMeshAsync(
      "",
      "",
      url,
      this._scene,
      undefined,
      ".glb"
    );

    const meshes = result.meshes.filter((m) => m.getTotalVertices() > 0);
    this._cache.set(url, meshes);
    return meshes;
  }

  /**
   * Carga un modelo y lo retorna como una sola malla combinada.
   */
  async loadModelSingle(url: string, name: string): Promise<AbstractMesh | null> {
    const meshes = await this.loadModel(url, name);
    if (meshes.length === 0) return null;
    if (meshes.length === 1) return meshes[0];

    const meshArray = meshes as Mesh[];
    const merged = Mesh.MergeMeshes(meshArray, true, true, undefined, false, true);
    if (merged) merged.name = name;
    return merged;
  }

  isCached(url: string): boolean {
    return this._cache.has(url);
  }

  dispose(): void {
    for (const meshes of this._cache.values()) {
      for (const m of meshes) {
        m.dispose();
      }
    }
    this._cache.clear();
  }
}
