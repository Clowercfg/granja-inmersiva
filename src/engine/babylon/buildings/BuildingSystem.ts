import {
  Scene,
  Engine,
  MeshBuilder,
  PBRMaterial,
  Color3,
  Vector3,
  Matrix,
  Quaternion,
  TransformNode,
  VertexData,
  Mesh,
  AbstractMesh,
} from "@babylonjs/core";
import type { ShadowGenerator } from "@babylonjs/core";
import { BUILDING_CONFIG } from "../../../config/world";
import { STATIC_BUILDINGS, FENCE_SEGMENTS } from "../../../config/layout";
import { terrainHeight } from "../world/terrainMath";
import type { BabylonSystem } from "../vegetation/TreeSystem";

const QY = (angle: number) => Quaternion.RotationAxis(Vector3.Up(), angle);

interface Materials {
  redPlank: PBRMaterial;
  whiteWall: PBRMaterial;
  woodWall: PBRMaterial;
  grayRoof: PBRMaterial;
  redRoof: PBRMaterial;
  woodRoof: PBRMaterial;
  metalWall: PBRMaterial;
  metalRoof: PBRMaterial;
  glass: PBRMaterial;
  woodFrame: PBRMaterial;
  darkDoor: PBRMaterial;
  windowMat: PBRMaterial;
  fenceMat: PBRMaterial;
  fenceRailMat: PBRMaterial;
}

function createMaterials(scene: Scene): Materials {
  const redPlank = new PBRMaterial("redPlankMat", scene);
  redPlank.albedoColor = new Color3(0.65, 0.18, 0.12);
  redPlank.roughness = 0.9;
  redPlank.metallic = 0.05;

  const whiteWall = new PBRMaterial("whiteWallMat", scene);
  whiteWall.albedoColor = new Color3(0.9, 0.88, 0.84);
  whiteWall.roughness = 0.85;
  whiteWall.metallic = 0;

  const woodWall = new PBRMaterial("woodWallMat", scene);
  woodWall.albedoColor = new Color3(0.52, 0.36, 0.22);
  woodWall.roughness = 0.92;
  woodWall.metallic = 0;

  const grayRoof = new PBRMaterial("grayRoofMat", scene);
  grayRoof.albedoColor = new Color3(0.48, 0.46, 0.44);
  grayRoof.roughness = 0.8;
  grayRoof.metallic = 0.1;

  const redRoof = new PBRMaterial("redRoofMat", scene);
  redRoof.albedoColor = new Color3(0.58, 0.14, 0.08);
  redRoof.roughness = 0.8;
  redRoof.metallic = 0.1;

  const woodRoof = new PBRMaterial("woodRoofMat", scene);
  woodRoof.albedoColor = new Color3(0.45, 0.32, 0.2);
  woodRoof.roughness = 0.88;
  woodRoof.metallic = 0;

  const metalWall = new PBRMaterial("metalWallMat", scene);
  metalWall.albedoColor = new Color3(0.6, 0.6, 0.62);
  metalWall.roughness = 0.65;
  metalWall.metallic = 0.4;

  const metalRoof = new PBRMaterial("metalRoofMat", scene);
  metalRoof.albedoColor = new Color3(0.5, 0.52, 0.55);
  metalRoof.roughness = 0.6;
  metalRoof.metallic = 0.45;

  const glass = new PBRMaterial("glassMat", scene);
  glass.albedoColor = new Color3(0.7, 0.85, 0.9);
  glass.roughness = 0.1;
  glass.metallic = 0.1;
  glass.alpha = 0.4;
  glass.backFaceCulling = false;
  glass.transparencyMode = 2;

  const woodFrame = new PBRMaterial("woodFrameMat", scene);
  woodFrame.albedoColor = new Color3(0.48, 0.34, 0.2);
  woodFrame.roughness = 0.9;
  woodFrame.metallic = 0;

  const darkDoor = new PBRMaterial("darkDoorMat", scene);
  darkDoor.albedoColor = new Color3(0.25, 0.16, 0.08);
  darkDoor.roughness = 0.92;
  darkDoor.metallic = 0;

  const windowMat = new PBRMaterial("windowMat", scene);
  windowMat.albedoColor = new Color3(0.6, 0.75, 0.9);
  windowMat.roughness = 0.05;
  windowMat.metallic = 0.15;
  windowMat.alpha = 0.6;
  windowMat.backFaceCulling = false;
  windowMat.transparencyMode = 2;

  const fenceMat = new PBRMaterial("buildingFenceMat", scene);
  fenceMat.albedoColor = new Color3(0.5, 0.38, 0.25);
  fenceMat.roughness = 0.95;
  fenceMat.metallic = 0;

  const fenceRailMat = new PBRMaterial("fenceRailMat", scene);
  fenceRailMat.albedoColor = new Color3(0.48, 0.36, 0.23);
  fenceRailMat.roughness = 0.95;
  fenceRailMat.metallic = 0;

  return {
    redPlank, whiteWall, woodWall, grayRoof, redRoof, woodRoof,
    metalWall, metalRoof, glass, woodFrame, darkDoor, windowMat,
    fenceMat, fenceRailMat,
  };
}

function createGableRoof(
  scene: Scene,
  width: number,
  depth: number,
  roofHeight: number,
  mat: PBRMaterial,
  name: string,
): Mesh {
  const hw = width / 2;
  const hd = depth / 2;

  const positions = new Float32Array([
    -hw, 0, -hd,
     hw, 0, -hd,
     hw, 0,  hd,
    -hw, 0,  hd,
     0, roofHeight, -hd,
     0, roofHeight,  hd,
  ]);

  const indices = new Uint16Array([
    0, 1, 4,
    1, 5, 4,
    1, 2, 5,
    2, 3, 5,
    3, 0, 5,
    0, 5, 4,
    3, 2, 1,
    3, 1, 0,
  ]);

  const normals: number[] = [];
  VertexData.ComputeNormals(positions, indices, normals);

  const vd = new VertexData();
  vd.positions = positions;
  vd.indices = indices;
  vd.normals = normals;

  const mesh = new Mesh(name, scene);
  vd.applyToMesh(mesh);
  mesh.material = mat;
  mesh.receiveShadows = true;
  return mesh;
}

function buildBarn(
  scene: Scene,
  mats: Materials,
  shadows: ShadowGenerator,
): void {
  const size = BUILDING_CONFIG.barn.size;
  const [w, d] = size;
  const wallH = 7.5;

  const base = MeshBuilder.CreateBox("barnBody", { width: w, height: wallH, depth: d }, scene);
  base.position.y = wallH / 2;
  base.material = mats.redPlank;
  base.receiveShadows = true;
  shadows.addShadowCaster(base);

  const roof = createGableRoof(scene, w + 1, d + 1, 4.6, mats.redRoof, "barnRoof");
  roof.position.y = wallH;
  shadows.addShadowCaster(roof);

  const door = MeshBuilder.CreateBox("barnDoor", { width: 3.5, height: 5.2, depth: 0.15 }, scene);
  door.position.set(0, 2.6, d / 2 + 0.08);
  door.material = mats.darkDoor;

  const trim = MeshBuilder.CreateBox("barnTrim", { width: w + 0.4, height: 0.2, depth: d + 0.4 }, scene);
  trim.position.y = wallH;
  trim.material = mats.woodFrame;
}

function buildHouse(
  scene: Scene,
  mats: Materials,
  shadows: ShadowGenerator,
): void {
  const size = BUILDING_CONFIG.house.size;
  const [w, d] = size;
  const wallH = 5.6;

  const base = MeshBuilder.CreateBox("houseBody", { width: w, height: wallH, depth: d }, scene);
  base.position.y = wallH / 2;
  base.material = mats.whiteWall;
  base.receiveShadows = true;
  shadows.addShadowCaster(base);

  const roof = createGableRoof(scene, w + 0.8, d + 0.8, 3.8, mats.redRoof, "houseRoof");
  roof.position.y = wallH;
  shadows.addShadowCaster(roof);

  const door = MeshBuilder.CreateBox("houseDoor", { width: 1.2, height: 2.8, depth: 0.12 }, scene);
  door.position.set(0, 1.4, d / 2 + 0.07);
  door.material = mats.darkDoor;

  const windowW = 1;
  const windowH = 1.2;
  const windowPositions = [
    new Vector3(-3, 3.1, d / 2 + 0.06),
    new Vector3(3, 3.1, d / 2 + 0.06),
    new Vector3(-3, 3.1, -d / 2 - 0.06),
    new Vector3(3, 3.1, -d / 2 - 0.06),
  ];
  for (let i = 0; i < windowPositions.length; i++) {
    const win = MeshBuilder.CreateBox(`houseWindow${i}`, { width: windowW, height: windowH, depth: 0.08 }, scene);
    win.position = windowPositions[i];
    win.material = mats.windowMat;
  }

  const trim = MeshBuilder.CreateBox("houseTrim", { width: w + 0.3, height: 0.15, depth: d + 0.3 }, scene);
  trim.position.y = wallH;
  trim.material = mats.woodFrame;
}

function buildWorkshop(
  scene: Scene,
  mats: Materials,
  shadows: ShadowGenerator,
): void {
  const size = BUILDING_CONFIG.workshop.size;
  const [w, d] = size;
  const wallH = 5;

  const base = MeshBuilder.CreateBox("workshopBody", { width: w, height: wallH, depth: d }, scene);
  base.position.y = wallH / 2;
  base.material = mats.woodWall;
  base.receiveShadows = true;
  shadows.addShadowCaster(base);

  const roof = createGableRoof(scene, w + 0.6, d + 0.6, 3.2, mats.grayRoof, "workshopRoof");
  roof.position.y = wallH;
  shadows.addShadowCaster(roof);

  const door = MeshBuilder.CreateBox("workshopDoor", { width: 2.2, height: 3.8, depth: 0.12 }, scene);
  door.position.set(0, 1.9, d / 2 + 0.07);
  door.material = mats.darkDoor;

  const trim = MeshBuilder.CreateBox("workshopTrim", { width: w + 0.2, height: 0.12, depth: d + 0.2 }, scene);
  trim.position.y = wallH;
  trim.material = mats.woodFrame;
}

function buildWarehouse(
  scene: Scene,
  mats: Materials,
  shadows: ShadowGenerator,
): void {
  const size = BUILDING_CONFIG.warehouse.size;
  const [w, d] = size;
  const wallH = 6.2;

  const base = MeshBuilder.CreateBox("warehouseBody", { width: w, height: wallH, depth: d }, scene);
  base.position.y = wallH / 2;
  base.material = mats.metalWall;
  base.receiveShadows = true;
  shadows.addShadowCaster(base);

  const flatRoof = MeshBuilder.CreateBox("warehouseRoof", { width: w + 0.4, height: 0.3, depth: d + 0.4 }, scene);
  flatRoof.position.y = wallH + 0.15;
  flatRoof.material = mats.metalRoof;
  flatRoof.receiveShadows = true;
  shadows.addShadowCaster(flatRoof);

  const trim = MeshBuilder.CreateBox("warehouseTrim", { width: w + 0.6, height: 0.15, depth: d + 0.6 }, scene);
  trim.position.y = wallH + 0.35;
  trim.material = mats.woodFrame;

  const door = MeshBuilder.CreateBox("warehouseDoor", { width: 3, height: 4.2, depth: 0.12 }, scene);
  door.position.set(0, 2.1, d / 2 + 0.07);
  door.material = mats.darkDoor;
}

function buildGreenhouse(
  scene: Scene,
  mats: Materials,
  shadows: ShadowGenerator,
): void {
  const size = BUILDING_CONFIG.greenhouse.size;
  const [w, d] = size;
  const wallH = 4.2;

  const glassPanels = [
    { w: w, h: wallH, d: 0.08, pos: new Vector3(0, wallH / 2, d / 2) },
    { w: w, h: wallH, d: 0.08, pos: new Vector3(0, wallH / 2, -d / 2) },
    { w: 0.08, h: wallH, d: d, pos: new Vector3(w / 2, wallH / 2, 0) },
    { w: 0.08, h: wallH, d: d, pos: new Vector3(-w / 2, wallH / 2, 0) },
  ];
  for (let i = 0; i < glassPanels.length; i++) {
    const p = glassPanels[i];
    const panel = MeshBuilder.CreateBox(`ghGlass${i}`, { width: p.w, height: p.h, depth: p.d }, scene);
    panel.position = p.pos;
    panel.material = mats.glass;
  }

  const roof = createGableRoof(scene, w + 0.4, d + 0.4, 2.6, mats.glass, "ghRoof");
  roof.position.y = wallH;

  const frameH = 0.08;
  const frameMembers = [
    { w: w + 0.2, h: frameH, d: frameH, pos: new Vector3(0, wallH, d / 2) },
    { w: w + 0.2, h: frameH, d: frameH, pos: new Vector3(0, wallH, -d / 2) },
    { w: frameH, h: frameH, d: d + 0.2, pos: new Vector3(w / 2, wallH, 0) },
    { w: frameH, h: frameH, d: d + 0.2, pos: new Vector3(-w / 2, wallH, 0) },
    { w: frameH, h: wallH, d: frameH, pos: new Vector3(w / 2, wallH / 2, d / 2) },
    { w: frameH, h: wallH, d: frameH, pos: new Vector3(-w / 2, wallH / 2, d / 2) },
    { w: frameH, h: wallH, d: frameH, pos: new Vector3(w / 2, wallH / 2, -d / 2) },
    { w: frameH, h: wallH, d: frameH, pos: new Vector3(-w / 2, wallH / 2, -d / 2) },
  ];
  for (let i = 0; i < frameMembers.length; i++) {
    const f = frameMembers[i];
    const member = MeshBuilder.CreateBox(`ghFrame${i}`, { width: f.w, height: f.h, depth: f.d }, scene);
    member.position = f.pos;
    member.material = mats.woodFrame;
  }
}

function buildFenceSegment(
  scene: Scene,
  mats: Materials,
  shadows: ShadowGenerator,
  x: number,
  z: number,
  rot: number,
  length: number,
): void {
  const post = MeshBuilder.CreateCylinder(
    "fencePost",
    { height: 1.8, diameter: 0.12, tessellation: 6 },
    scene,
  );
  post.material = mats.fenceMat;
  post.isVisible = false;

  const m1 = Matrix.Compose(Vector3.One(), Quaternion.Identity(), new Vector3(x, 0.9, z));
  post.thinInstanceAdd(m1);

  const railH = 1.2;
  const rail = MeshBuilder.CreateBox("fenceRail", { width: length, height: 0.08, depth: 0.06 }, scene);
  rail.position.set(x, railH, z);
  rail.rotation.y = rot;
  rail.material = mats.fenceRailMat;

  const rail2 = rail.clone("fenceRail2");
  if (rail2) rail2.position.y = 0.6;

  post.receiveShadows = true;
  shadows.addShadowCaster(post);
}

export class BuildingSystem implements BabylonSystem {
  private scene!: Scene;
  private engine!: Engine;
  private mats!: Materials;
  private allMeshes: AbstractMesh[] = [];
  private disposed = false;

  init(scene: Scene, engine: Engine, shadows?: ShadowGenerator): void {
    this.scene = scene;
    this.engine = engine;
    this.mats = createMaterials(scene);

    for (const b of STATIC_BUILDINGS) {
      const [bx, _by, bz] = b.position;
      const y = terrainHeight(bx, bz);

      const pivot = new TransformNode(`building_${b.uid}`, scene);
      pivot.position.set(bx, y, bz);
      pivot.rotation.y = b.rotation;

      const childCountBefore = scene.meshes.length;

      switch (b.type) {
        case "barn":
          buildBarn(scene, this.mats, shadows!);
          break;
        case "house":
          buildHouse(scene, this.mats, shadows!);
          break;
        case "workshop":
          buildWorkshop(scene, this.mats, shadows!);
          break;
        case "warehouse":
          buildWarehouse(scene, this.mats, shadows!);
          break;
        case "greenhouse":
          buildGreenhouse(scene, this.mats, shadows!);
          break;
      }

      for (let i = childCountBefore; i < scene.meshes.length; i++) {
        const m = scene.meshes[i];
        m.parent = pivot;
        m.metadata = { entityType: "building", entityId: b.uid, entityKind: b.type };
      }
    }

    this.buildFences(shadows!);
  }

  private buildFences(shadows: ShadowGenerator): void {
    const fencePostMat = this.mats.fenceMat;
    const fenceRailMat = this.mats.fenceRailMat;

    const post = MeshBuilder.CreateCylinder(
      "fencePostBase",
      { height: 1.8, diameter: 0.12, tessellation: 6 },
      this.scene,
    );
    post.material = fencePostMat;
    post.isVisible = false;
    post.receiveShadows = true;
    shadows.addShadowCaster(post);

    for (const [fx, fz, frot] of FENCE_SEGMENTS) {
      const alongX = frot !== 0;
      const segLen = alongX ? 12 : 12;

      const posts = 3;
      for (let p = 0; p < posts; p++) {
        const t = p / (posts - 1);
        let px: number;
        let pz: number;
        if (alongX) {
          px = fx;
          pz = fz - segLen / 2 + t * segLen;
        } else {
          px = fx - segLen / 2 + t * segLen;
          pz = fz;
        }
        const y = terrainHeight(px, pz);
        const m = Matrix.Compose(Vector3.One(), Quaternion.Identity(), new Vector3(px, y + 0.9, pz));
        post.thinInstanceAdd(m);
      }

      const railLen = segLen;
      const rail = MeshBuilder.CreateBox(
        `fenceRail_${fx}_${fz}`,
        { width: railLen, height: 0.08, depth: 0.06 },
        this.scene,
      );
      rail.position.set(fx, terrainHeight(fx, fz) + 1.2, fz);
      rail.rotation.y = frot;
      rail.material = fenceRailMat;

      const rail2 = rail.clone(`fenceRail2_${fx}_${fz}`);
      if (rail2) rail2.position.y = terrainHeight(fx, fz) + 0.6;
    }
  }

  dispose(): void {
    if (this.disposed) return;
    this.disposed = true;
    const mats = this.mats;
    for (const key of Object.keys(mats) as Array<keyof Materials>) {
      mats[key].dispose();
    }
  }
}
