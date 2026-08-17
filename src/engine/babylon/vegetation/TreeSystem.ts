import {
  Scene,
  Engine,
  MeshBuilder,
  PBRMaterial,
  Color3,
  Vector3,
  Matrix,
  Quaternion,
  VertexData,
  Mesh,
} from "@babylonjs/core";
import type { ShadowGenerator } from "@babylonjs/core";
import { generateVegetationData, type VegetationInstance } from "./vegetationScatter";

export interface BabylonSystem {
  init(scene: Scene, engine: Engine): void;
  update?(dt: number): void;
  dispose(): void;
}

const TRUNK_COLOR = new Color3(0x3a / 255, 0x25 / 255, 0x12 / 255);
const LEAF_COLORS = [
  new Color3(0x2a / 255, 0x5c / 255, 0x1a / 255),
  new Color3(0x1e / 255, 0x4d / 255, 0x16 / 255),
  new Color3(0x35 / 255, 0x6b / 255, 0x20 / 255),
  new Color3(0x22 / 255, 0x50 / 255, 0x18 / 255),
  new Color3(0x2d / 255, 0x62 / 255, 0x1c / 255),
  new Color3(0x26 / 255, 0x55 / 255, 0x19 / 255),
];

interface VariantMeshes {
  trunk: Mesh;
  leafBlobs: Mesh[];
  trunkCount: number;
  leafCounts: number[];
  trunkBuffer?: Float32Array;
  leafBuffers?: Float32Array[];
}

function buildDefaultTree(scene: Scene): { trunk: Mesh; leafBlobs: Mesh[] } {
  const trunk = MeshBuilder.CreateCylinder(
    "trunkDefault",
    { height: 3, diameterTop: 0.35, diameterBottom: 0.55, tessellation: 6 },
    scene,
  );
  trunk.bakeCurrentTransformIntoVertices();

  const leaf1 = MeshBuilder.CreateSphere("leafDefault1", { diameter: 3.2, segments: 5 }, scene);
  leaf1.position.y = 2.8;
  leaf1.bakeCurrentTransformIntoVertices();

  const leaf2 = MeshBuilder.CreateSphere("leafDefault2", { diameter: 2.6, segments: 5 }, scene);
  leaf2.position.set(0.8, 3.6, 0.5);
  leaf2.bakeCurrentTransformIntoVertices();

  const leaf3 = MeshBuilder.CreateSphere("leafDefault3", { diameter: 2.2, segments: 5 }, scene);
  leaf3.position.set(-0.6, 4.0, -0.4);
  leaf3.bakeCurrentTransformIntoVertices();

  return { trunk, leafBlobs: [leaf1, leaf2, leaf3] };
}

function buildConeTree(scene: Scene): { trunk: Mesh; leafBlobs: Mesh[] } {
  const trunk = MeshBuilder.CreateCylinder(
    "trunkCone",
    { height: 3.5, diameterTop: 0.3, diameterBottom: 0.5, tessellation: 6 },
    scene,
  );
  trunk.bakeCurrentTransformIntoVertices();

  const cone = MeshBuilder.CreateCylinder(
    "leafCone",
    { height: 5, diameterTop: 0, diameterBottom: 3.5, tessellation: 8 },
    scene,
  );
  cone.position.y = 3.5;
  cone.bakeCurrentTransformIntoVertices();

  return { trunk, leafBlobs: [cone] };
}

function buildPlateauTree(scene: Scene): { trunk: Mesh; leafBlobs: Mesh[] } {
  const trunk = MeshBuilder.CreateCylinder(
    "trunkPlateau",
    { height: 4, diameterTop: 0.4, diameterBottom: 0.6, tessellation: 6 },
    scene,
  );
  trunk.bakeCurrentTransformIntoVertices();

  const canopy = MeshBuilder.CreateCylinder(
    "leafPlateau",
    { height: 1.2, diameterTop: 4.5, diameterBottom: 4.0, tessellation: 8 },
    scene,
  );
  canopy.position.y = 4.5;
  canopy.bakeCurrentTransformIntoVertices();

  const center = MeshBuilder.CreateSphere("leafPlateauCenter", { diameter: 3, segments: 5 }, scene);
  center.position.y = 4.8;
  center.bakeCurrentTransformIntoVertices();

  return { trunk, leafBlobs: [canopy, center] };
}

function buildQ1Tree(scene: Scene): { trunk: Mesh; leafBlobs: Mesh[] } {
  const trunk = MeshBuilder.CreateCylinder(
    "trunkQ1",
    { height: 2.5, diameterTop: 0.3, diameterBottom: 0.45, tessellation: 6 },
    scene,
  );
  trunk.bakeCurrentTransformIntoVertices();

  const blob1 = MeshBuilder.CreateSphere("leafQ1a", { diameter: 3.8, segments: 5 }, scene);
  blob1.position.set(0, 2.5, 0);
  blob1.scaling.y = 0.7;
  blob1.bakeCurrentTransformIntoVertices();

  const blob2 = MeshBuilder.CreateSphere("leafQ1b", { diameter: 2.4, segments: 5 }, scene);
  blob2.position.set(0.5, 3.2, 0.3);
  blob2.bakeCurrentTransformIntoVertices();

  return { trunk, leafBlobs: [blob1, blob2] };
}

function buildQ2Tree(scene: Scene): { trunk: Mesh; leafBlobs: Mesh[] } {
  const trunk = MeshBuilder.CreateCylinder(
    "trunkQ2",
    { height: 5, diameterTop: 0.25, diameterBottom: 0.5, tessellation: 6 },
    scene,
  );
  trunk.bakeCurrentTransformIntoVertices();

  const blob1 = MeshBuilder.CreateSphere("leafQ2a", { diameter: 2.5, segments: 5 }, scene);
  blob1.position.y = 5;
  blob1.bakeCurrentTransformIntoVertices();

  const blob2 = MeshBuilder.CreateSphere("leafQ2b", { diameter: 2, segments: 5 }, scene);
  blob2.position.set(0.3, 6.2, -0.2);
  blob2.bakeCurrentTransformIntoVertices();

  const blob3 = MeshBuilder.CreateSphere("leafQ2c", { diameter: 1.6, segments: 5 }, scene);
  blob3.position.set(-0.4, 6.8, 0.1);
  blob3.bakeCurrentTransformIntoVertices();

  return { trunk, leafBlobs: [blob1, blob2, blob3] };
}

function buildQ3Tree(scene: Scene): { trunk: Mesh; leafBlobs: Mesh[] } {
  const trunk = MeshBuilder.CreateCylinder(
    "trunkQ3",
    { height: 2, diameterTop: 0.3, diameterBottom: 0.6, tessellation: 6 },
    scene,
  );
  trunk.bakeCurrentTransformIntoVertices();

  const blob1 = MeshBuilder.CreateSphere("leafQ3a", { diameter: 4.2, segments: 5 }, scene);
  blob1.position.y = 2.2;
  blob1.scaling.set(1, 0.6, 1);
  blob1.bakeCurrentTransformIntoVertices();

  const blob2 = MeshBuilder.CreateSphere("leafQ3b", { diameter: 3, segments: 5 }, scene);
  blob2.position.set(0, 3.0, 0);
  blob2.scaling.set(1.2, 0.5, 1.2);
  blob2.bakeCurrentTransformIntoVertices();

  return { trunk, leafBlobs: [blob1, blob2] };
}

const VARIANT_BUILDERS = [
  buildDefaultTree,
  buildConeTree,
  buildPlateauTree,
  buildQ1Tree,
  buildQ2Tree,
  buildQ3Tree,
];

const QY = (angle: number) => Quaternion.RotationAxis(Vector3.Up(), angle);

export class TreeSystem implements BabylonSystem {
  private scene!: Scene;
  private engine!: Engine;
  private shadows?: ShadowGenerator;
  private variants: VariantMeshes[] = [];
  private trunkMat!: PBRMaterial;
  private leafMats!: PBRMaterial[];
  private disposed = false;

  init(scene: Scene, engine: Engine, shadows?: ShadowGenerator): void {
    this.scene = scene;
    this.engine = engine;
    this.shadows = shadows;

    this.trunkMat = new PBRMaterial("treeTrunkMat", scene);
    this.trunkMat.albedoColor = TRUNK_COLOR;
    this.trunkMat.roughness = 0.95;
    this.trunkMat.metallic = 0;

    this.leafMats = LEAF_COLORS.map((c, i) => {
      const mat = new PBRMaterial(`treeLeafMat${i}`, scene);
      mat.albedoColor = c;
      mat.roughness = 0.85;
      mat.metallic = 0;
      return mat;
    });

    const data = generateVegetationData();
    this.buildVariants();
    this.populateInstances(data.trees);
  }

  private buildVariants(): void {
    for (let v = 0; v < VARIANT_BUILDERS.length; v++) {
      const { trunk, leafBlobs } = VARIANT_BUILDERS[v](this.scene);

      trunk.material = this.trunkMat;
      trunk.isVisible = false;
      trunk.receiveShadows = true;

      const leafCounts: number[] = [];
      for (let i = 0; i < leafBlobs.length; i++) {
        leafBlobs[i].material = this.leafMats[v % this.leafMats.length];
        leafBlobs[i].isVisible = false;
        leafBlobs[i].receiveShadows = true;
        leafCounts.push(0);
      }

      this.variants.push({ trunk, leafBlobs, trunkCount: 0, leafCounts });
    }
  }

  private populateInstances(trees: VegetationInstance[]): void {
    const tempS = Vector3.Zero();
    const tempP = Vector3.Zero();
    const tempM = Matrix.Identity();

    for (const tree of trees) {
      const v = tree.variant % this.variants.length;
      const vm = this.variants[v];

      const sx = tree.scale;
      const sy = tree.scale;
      const sz = tree.scale;
      tempS.set(sx, sy, sz);
      tempP.set(tree.x, tree.y + 1.5 * sy, tree.z);
      Matrix.ComposeToRef(tempS, QY(tree.yaw), tempP, tempM);

      const idx = vm.trunkCount;
      const trunkBuf = this._ensureTrunkBuf(vm, idx);
      tempM.copyToArray(trunkBuf, idx * 16);
      vm.trunkCount++;

      for (let i = 0; i < vm.leafBlobs.length; i++) {
        const leafScale = sx * (0.85 + (i * 0.15));
        const blob = vm.leafBlobs[i];
        const pos = blob.position;
        tempS.set(leafScale, leafScale, leafScale);
        tempP.set(
          tree.x + pos.x * leafScale,
          tree.y + 1.5 * sy + pos.y * leafScale,
          tree.z + pos.z * leafScale,
        );
        Matrix.ComposeToRef(tempS, QY(tree.yaw), tempP, tempM);

        const li = vm.leafCounts[i];
        const leafBuf = this._ensureLeafBuf(vm, i, li);
        tempM.copyToArray(leafBuf, li * 16);
        vm.leafCounts[i]++;
      }
    }

    for (const vm of this.variants) {
      if (vm.trunkCount > 0) {
        vm.trunk.thinInstanceSetBuffer("matrix", vm.trunkBuffer!, 16, false);
        for (let li = 0; li < vm.leafBlobs.length; li++) {
          const buf = vm.leafBuffers?.[li];
          if (buf && vm.leafCounts[li] > 0) {
            vm.leafBlobs[li].thinInstanceSetBuffer("matrix", buf, 16, false);
          }
        }
      }
    }

    if (this.shadows) {
      for (const vm of this.variants) {
        if (vm.trunkCount > 0) {
          this.shadows.addShadowCaster(vm.trunk);
          for (const blob of vm.leafBlobs) {
            this.shadows.addShadowCaster(blob);
          }
        }
      }
    }
  }

  private _ensureTrunkBuf(vm: VariantMeshes, idx: number): Float32Array {
    if (!vm.trunkBuffer || vm.trunkBuffer.length < (idx + 1) * 16) {
      const newLen = Math.max((idx + 1) * 16, (idx + 64) * 16);
      const newBuf = new Float32Array(newLen);
      if (vm.trunkBuffer) newBuf.set(vm.trunkBuffer);
      vm.trunkBuffer = newBuf;
    }
    return vm.trunkBuffer;
  }

  private _ensureLeafBuf(vm: VariantMeshes, li: number, idx: number): Float32Array {
    if (!vm.leafBuffers) vm.leafBuffers = [];
    if (!vm.leafBuffers[li] || vm.leafBuffers[li].length < (idx + 1) * 16) {
      const newLen = Math.max((idx + 1) * 16, (idx + 64) * 16);
      const newBuf = new Float32Array(newLen);
      if (vm.leafBuffers[li]) newBuf.set(vm.leafBuffers[li]);
      vm.leafBuffers[li] = newBuf;
    }
    return vm.leafBuffers[li];
  }

  update(dt: number): void {
    const t = performance.now() * 0.001;
    for (const vm of this.variants) {
      if (vm.trunkCount === 0 || !vm.trunkBuffer) continue;

      const tempPos = Vector3.Zero();
      const tempQuat = Quaternion.Identity();
      const tempScale = Vector3.One();

      for (let i = 0; i < vm.trunkCount; i++) {
        const offset = i * 16;
        const m = Matrix.FromArray(vm.trunkBuffer, offset);
        m.decompose(tempScale, tempQuat, tempPos);

        const phase = (tempPos.x * 0.3 + tempPos.z * 0.2) & 0xffff;
        const sway = Math.sin(t * 1.2 + phase) * 0.02 * tempScale.y;

        m.setTranslation(new Vector3(tempPos.x + sway, tempPos.y, tempPos.z));
        m.copyToArray(vm.trunkBuffer, offset);
      }
      vm.trunk.thinInstanceSetBuffer("matrix", vm.trunkBuffer, 16, false);

      for (let li = 0; li < vm.leafBlobs.length; li++) {
        const blob = vm.leafBlobs[li];
        const bMatrices = vm.leafBuffers?.[li];
        if (!bMatrices) continue;
        const bCount = vm.leafCounts[li];
        for (let i = 0; i < bCount; i++) {
          const offset = i * 16;
          const m = Matrix.FromArray(bMatrices, offset);
          m.decompose(tempScale, tempQuat, tempPos);

          const phase = (tempPos.x * 0.3 + tempPos.z * 0.2) & 0xffff;
          const sway = Math.sin(t * 1.2 + phase) * 0.03 * tempScale.y;

          m.setTranslation(new Vector3(tempPos.x + sway, tempPos.y, tempPos.z));
          m.copyToArray(bMatrices, offset);
        }
        blob.thinInstanceSetBuffer("matrix", bMatrices, 16, false);
      }
    }
  }

  dispose(): void {
    if (this.disposed) return;
    this.disposed = true;
    for (const vm of this.variants) {
      vm.trunk.dispose();
      for (const blob of vm.leafBlobs) blob.dispose();
    }
    this.trunkMat.dispose();
    for (const m of this.leafMats) m.dispose();
  }
}
