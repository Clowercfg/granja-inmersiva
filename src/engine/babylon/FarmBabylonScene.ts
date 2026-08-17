import { Scene, Color3, Color4 } from "@babylonjs/core";
import { createFarmCamera } from "./BabylonCamera";
import { createLighting, type LightingSetup } from "./BabylonLighting";
import { createTerrain, createWater } from "./BabylonEnvironment";
import { createTrees, createRocks, createGrassPatches, createBarn, createPath } from "./BabylonWorld";
import { BabylonAssetManager } from "./BabylonAssetManager";

export interface BabylonSceneContext {
  scene: Scene;
  lighting: LightingSetup;
  assetManager: BabylonAssetManager;
  dispose: () => void;
}

export function createFarmScene(scene: Scene): BabylonSceneContext {
  console.log("[Babylon] Iniciando escena...");

  scene.clearColor = new Color4(0.62, 0.76, 0.9, 1);
  scene.ambientColor = new Color3(0.5, 0.55, 0.6);

  console.log("[Babylon] Creando cámara...");
  const camera = createFarmCamera(scene);

  console.log("[Babylon] Creando iluminación...");
  const lighting = createLighting(scene);

  const assetManager = new BabylonAssetManager(scene);

  console.log("[Babylon] Creando terreno...");
  createTerrain(scene, lighting.shadows);

  console.log("[Babylon] Creando agua...");
  createWater(scene);

  console.log("[Babylon] Creando árboles...");
  createTrees(scene, lighting.shadows);

  console.log("[Babylon] Creando piedras...");
  createRocks(scene, lighting.shadows);

  console.log("[Babylon] Creando hierba...");
  createGrassPatches(scene);

  console.log("[Babylon] Creando granero...");
  createBarn(scene, lighting.shadows);

  console.log("[Babylon] Creando caminos...");
  createPath(scene);

  console.log("[Babylon] Escena lista!");

  return {
    scene,
    lighting,
    assetManager,
    dispose: () => {
      lighting.dispose();
      assetManager.dispose();
      scene.dispose();
    },
  };
}
