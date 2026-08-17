import {
  Scene,
  MeshBuilder,
  PBRMaterial,
  Color3,
  Vector3,
  Mesh,
  Matrix,
  Quaternion,
  TransformNode,
} from "@babylonjs/core";
import type { ShadowGenerator } from "@babylonjs/core";

/** Crea vegetación, granero, cercas y caminos usando thin instances para máximo rendimiento. */

function seedRandom(seed: number): () => number {
  let s = seed;
  return () => {
    s = (s * 16807 + 0) % 2147483647;
    return (s - 1) / 2147483646;
  };
}

function qY(angle: number): Quaternion {
  return Quaternion.RotationAxis(Vector3.Up(), angle);
}

// ─── ÁRBOLES ───

export function createTrees(scene: Scene, shadows: ShadowGenerator): void {
  const rng = seedRandom(777);

  const trunk = MeshBuilder.CreateCylinder("trunkBase", { height: 3, diameterTop: 0.3, diameterBottom: 0.5, tessellation: 6 }, scene);
  const trunkMat = new PBRMaterial("trunkMat", scene);
  trunkMat.albedoColor = new Color3(0.35, 0.22, 0.12);
  trunkMat.roughness = 0.95;
  trunkMat.metallic = 0;
  trunk.material = trunkMat;
  trunk.isVisible = false;

  const leaves = MeshBuilder.CreateSphere("leavesBase", { diameter: 3.5, segments: 6 }, scene);
  const leavesMat = new PBRMaterial("leavesMat", scene);
  leavesMat.albedoColor = new Color3(0.22, 0.48, 0.18);
  leavesMat.roughness = 0.85;
  leavesMat.metallic = 0;
  leaves.material = leavesMat;
  leaves.isVisible = false;

  const treeCount = 25;

  for (let i = 0; i < treeCount; i++) {
    const angle = rng() * Math.PI * 2;
    const dist = 55 + rng() * 85;
    const x = Math.cos(angle) * dist;
    const z = Math.sin(angle) * dist;
    const scale = 0.7 + rng() * 0.8;
    const rotY = rng() * Math.PI * 2;

    const mTrunk = Matrix.Compose(
      new Vector3(scale, scale, scale),
      qY(rotY),
      new Vector3(x, 1.5 * scale, z)
    );
    trunk.thinInstanceAdd(mTrunk);

    const leafScale = scale * (0.9 + rng() * 0.3);
    const mLeaves = Matrix.Compose(
      new Vector3(leafScale, leafScale * 0.8, leafScale),
      qY(rotY),
      new Vector3(x, 3 * scale + leafScale * 0.8, z)
    );
    leaves.thinInstanceAdd(mLeaves);
  }

  trunk.receiveShadows = true;
  shadows.addShadowCaster(trunk);
  leaves.receiveShadows = true;
  shadows.addShadowCaster(leaves);
}

// ─── PIEDRAS ───

export function createRocks(scene: Scene, shadows: ShadowGenerator): void {
  const rng = seedRandom(321);

  const rock = MeshBuilder.CreateIcoSphere("rockBase", { radius: 1, subdivisions: 2 }, scene);
  const rockMat = new PBRMaterial("rockMat", scene);
  rockMat.albedoColor = new Color3(0.5, 0.48, 0.45);
  rockMat.roughness = 0.92;
  rockMat.metallic = 0.05;
  rock.material = rockMat;
  rock.isVisible = false;

  for (let i = 0; i < 20; i++) {
    const angle = rng() * Math.PI * 2;
    const dist = 20 + rng() * 110;
    const x = Math.cos(angle) * dist;
    const z = Math.sin(angle) * dist;
    const scale = 0.3 + rng() * 1.2;

    const m = Matrix.Compose(
      new Vector3(scale * (0.8 + rng() * 0.4), scale * (0.5 + rng() * 0.3), scale * (0.8 + rng() * 0.4)),
      qY(rng() * Math.PI * 2),
      new Vector3(x, scale * 0.2, z)
    );
    rock.thinInstanceAdd(m);
  }

  rock.receiveShadows = true;
  shadows.addShadowCaster(rock);
}

// ─── HIERBA ───

export function createGrassPatches(scene: Scene): void {
  const rng = seedRandom(555);

  const grass = MeshBuilder.CreatePlane("grassBase", { size: 0.5 }, scene);
  const grassMat = new PBRMaterial("grassMat", scene);
  grassMat.albedoColor = new Color3(0.3, 0.55, 0.2);
  grassMat.roughness = 0.9;
  grassMat.metallic = 0;
  grassMat.backFaceCulling = false;
  grass.material = grassMat;
  grass.isVisible = false;

  for (let i = 0; i < 40; i++) {
    const angle = rng() * Math.PI * 2;
    const dist = 25 + rng() * 100;
    const x = Math.cos(angle) * dist;
    const z = Math.sin(angle) * dist;
    const scale = 0.4 + rng() * 0.6;

    const m = Matrix.Compose(
      new Vector3(scale, scale * 1.5, scale),
      qY(rng() * Math.PI),
      new Vector3(x, scale * 0.5, z)
    );
    grass.thinInstanceAdd(m);
  }
}

// ─── GRANERO / BARN ───

export function createBarn(scene: Scene, shadows: ShadowGenerator): void {
  const base = MeshBuilder.CreateBox("barnBase", { width: 12, height: 6, depth: 8 }, scene);
  base.position = new Vector3(30, 3, 0);
  const baseMat = new PBRMaterial("barnBaseMat", scene);
  baseMat.albedoColor = new Color3(0.55, 0.2, 0.15);
  baseMat.roughness = 0.85;
  baseMat.metallic = 0.05;
  base.material = baseMat;
  base.receiveShadows = true;
  shadows.addShadowCaster(base);

  const roof = MeshBuilder.CreateCylinder("barnRoof", {
    height: 14, diameterTop: 0, diameterBottom: 12, tessellation: 4, subdivisions: 1,
  }, scene);
  roof.scaling.y = 0.5;
  roof.position = new Vector3(30, 6.5, 0);
  roof.rotation.y = Math.PI / 4;
  const roofMat = new PBRMaterial("barnRoofMat", scene);
  roofMat.albedoColor = new Color3(0.6, 0.15, 0.1);
  roofMat.roughness = 0.8;
  roofMat.metallic = 0.1;
  roof.material = roofMat;
  roof.receiveShadows = true;
  shadows.addShadowCaster(roof);

  const door = MeshBuilder.CreateBox("barnDoor", { width: 3, height: 4, depth: 0.2 }, scene);
  door.position = new Vector3(30, 2, 4.15);
  const doorMat = new PBRMaterial("barnDoorMat", scene);
  doorMat.albedoColor = new Color3(0.3, 0.18, 0.1);
  doorMat.roughness = 0.9;
  doorMat.metallic = 0;
  door.material = doorMat;

  const silo = MeshBuilder.CreateCylinder("silo", { height: 10, diameter: 3, tessellation: 16 }, scene);
  silo.position = new Vector3(38, 5, -3);
  const siloMat = new PBRMaterial("siloMat", scene);
  siloMat.albedoColor = new Color3(0.55, 0.55, 0.55);
  siloMat.roughness = 0.7;
  siloMat.metallic = 0.3;
  silo.material = siloMat;
  silo.receiveShadows = true;
  shadows.addShadowCaster(silo);

  const siloRoof = MeshBuilder.CreateCylinder("siloRoof", {
    height: 2, diameterTop: 0, diameterBottom: 3.2, tessellation: 16,
  }, scene);
  siloRoof.position = new Vector3(38, 10.5, -3);
  const siloRoofMat = new PBRMaterial("siloRoofMat", scene);
  siloRoofMat.albedoColor = new Color3(0.45, 0.15, 0.1);
  siloRoofMat.roughness = 0.8;
  siloRoofMat.metallic = 0.1;
  siloRoof.material = siloRoofMat;

  createFences(scene, shadows);
}

// ─── CERCAS ───

function createFences(scene: Scene, shadows: ShadowGenerator): void {
  const fenceMat = new PBRMaterial("fenceMat", scene);
  fenceMat.albedoColor = new Color3(0.5, 0.38, 0.25);
  fenceMat.roughness = 0.95;
  fenceMat.metallic = 0;

  const post = MeshBuilder.CreateCylinder("fencePost", { height: 1.8, diameter: 0.12, tessellation: 6 }, scene);
  post.material = fenceMat;
  post.isVisible = false;

  const corners = [[-15, 15], [15, 15], [15, -15], [-15, -15]];

  for (const [cx, cz] of corners) {
    const m = Matrix.Compose(
      Vector3.One(),
      Quaternion.Identity(),
      new Vector3(cx, 0.9, cz)
    );
    post.thinInstanceAdd(m);
  }
  post.receiveShadows = true;
  shadows.addShadowCaster(post);

  for (let i = 0; i < corners.length; i++) {
    const [x1, z1] = corners[i];
    const [x2, z2] = corners[(i + 1) % corners.length];
    const dx = x2 - x1;
    const dz = z2 - z1;
    const len = Math.sqrt(dx * dx + dz * dz);
    const angle = Math.atan2(dz, dx);

    const bar = MeshBuilder.CreateBox(`fenceBar${i}`, { width: len, height: 0.08, depth: 0.06 }, scene);
    bar.position = new Vector3((x1 + x2) / 2, 1.2, (z1 + z2) / 2);
    bar.rotation.y = -angle;
    bar.material = fenceMat;
    bar.receiveShadows = true;

    const bar2 = bar.clone(`fenceBar2_${i}`, bar.parent);
    if (bar2) bar2.position.y = 0.6;
  }
}

// ─── CAMINO ───

export function createPath(scene: Scene): void {
  const pathMat = new PBRMaterial("pathMat", scene);
  pathMat.albedoColor = new Color3(0.5, 0.4, 0.28);
  pathMat.roughness = 0.98;
  pathMat.metallic = 0;

  const path = MeshBuilder.CreateGround("mainPath", { width: 4, height: 40 }, scene);
  path.position = new Vector3(15, 0.04, 0);
  path.material = pathMat;
  path.receiveShadows = true;

  const path2 = MeshBuilder.CreateGround("sidePath", { width: 30, height: 3 }, scene);
  path2.position = new Vector3(0, 0.04, 15);
  path2.material = pathMat;
  path2.receiveShadows = true;
}
