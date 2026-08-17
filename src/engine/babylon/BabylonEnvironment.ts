import {
  Scene,
  MeshBuilder,
  PBRMaterial,
  Color3,
  Vector3,
  Mesh,
  VertexData,
} from "@babylonjs/core";

/** Crea el terreno, agua y cielo para la escena Babylon de prueba. */

function seedRandom(seed: number): () => number {
  let s = seed;
  return () => {
    s = (s * 16807 + 0) % 2147483647;
    return (s - 1) / 2147483646;
  };
}

export function createTerrain(scene: Scene, shadows: ShadowGenerator): Mesh {
  const ground = MeshBuilder.CreateGround(
    "terrain",
    { width: 300, height: 300, subdivisions: 64, updatable: true },
    scene
  );

  const positions = ground.getVerticesData("position")!;
  const rng = seedRandom(42);
  for (let i = 0; i < positions.length; i += 3) {
    const x = positions[i];
    const z = positions[i + 2];
    const hill = Math.sin(x * 0.015) * Math.cos(z * 0.012) * 4;
    const wave = Math.sin(x * 0.04 + z * 0.03) * 1.5;
    const noise = (rng() - 0.5) * 0.3;
    const distCenter = Math.sqrt(x * x + z * z);
    const flatten = Math.max(0, 1 - distCenter / 60);
    positions[i + 1] = (hill + wave + noise) * (1 - flatten * 0.85);
  }
  ground.updateVerticesData("position", positions);
  const normals: number[] = [];
  const indices = ground.getIndices()!;
  const posArr = ground.getVerticesData("position")!;
  VertexData.ComputeNormals(posArr, indices, normals);
  ground.updateVerticesData("normal", normals);
  ground.receiveShadows = true;

  const mat = new PBRMaterial("terrainMat", scene);
  mat.albedoColor = new Color3(0.35, 0.42, 0.22);
  mat.roughness = 0.95;
  mat.metallic = 0;
  mat.emissiveColor = new Color3(0.02, 0.03, 0.01);
  ground.material = mat;

  shadows.addShadowCaster(ground);
  ground.receiveShadows = true;

  return ground;
}

import type { ShadowGenerator } from "@babylonjs/core";

export function createWater(scene: Scene): Mesh {
  const water = MeshBuilder.CreateDisc(
    "water",
    { radius: 18, tessellation: 48 },
    scene
  );
  water.rotation.x = Math.PI / 2;
  water.position = new Vector3(-40, 0.15, 30);

  const mat = new PBRMaterial("waterMat", scene);
  mat.albedoColor = new Color3(0.2, 0.4, 0.65);
  mat.roughness = 0.05;
  mat.metallic = 0.1;
  mat.alpha = 0.75;
  mat.emissiveColor = new Color3(0.03, 0.06, 0.12);
  water.material = mat;

  const shore = MeshBuilder.CreateTorus(
    "shore",
    { diameter: 37, thickness: 3, tessellation: 48 },
    scene
  );
  shore.rotation.x = Math.PI / 2;
  shore.position = new Vector3(-40, 0.08, 30);
  const shoreMat = new PBRMaterial("shoreMat", scene);
  shoreMat.albedoColor = new Color3(0.45, 0.35, 0.22);
  shoreMat.roughness = 0.98;
  shoreMat.metallic = 0;
  shore.material = shoreMat;
  shore.receiveShadows = true;

  return water;
}
