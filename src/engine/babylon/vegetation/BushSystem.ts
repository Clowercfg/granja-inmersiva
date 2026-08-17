import {
  Scene,
  Engine,
  MeshBuilder,
  PBRMaterial,
  Color3,
  Vector3,
  Matrix,
  Quaternion,
  Mesh,
} from "@babylonjs/core";
import type { ShadowGenerator } from "@babylonjs/core";
import { generateVegetationData, type VegetationInstance } from "./vegetationScatter";
import type { BabylonSystem } from "./TreeSystem";

const BUSH_COLORS = [
  new Color3(0x1e / 255, 0x4a / 255, 0x14 / 255),
  new Color3(0x28 / 255, 0x5c / 255, 0x1a / 255),
  new Color3(0x22 / 255, 0x52 / 255, 0x16 / 255),
];

const QY = (angle: number) => Quaternion.RotationAxis(Vector3.Up(), angle);

interface BushVariant {
  blob: Mesh;
  mat: PBRMaterial;
  count: number;
  buffer: Float32Array | null;
}

export class BushSystem implements BabylonSystem {
  private scene!: Scene;
  private engine!: Engine;
  private variants: BushVariant[] = [];
  private disposed = false;

  init(scene: Scene, engine: Engine, shadows?: ShadowGenerator): void {
    this.scene = scene;
    this.engine = engine;

    const radii = [1.0, 0.7, 0.5];
    const segs = [5, 5, 4];

    for (let v = 0; v < 3; v++) {
      const mat = new PBRMaterial(`bushMat${v}`, scene);
      mat.albedoColor = BUSH_COLORS[v];
      mat.roughness = 0.88;
      mat.metallic = 0;

      const blob = MeshBuilder.CreateSphere(
        `bushBlob${v}`,
        { diameter: 1, segments: segs[v] },
        scene,
      );
      blob.material = mat;
      blob.isVisible = false;
      blob.receiveShadows = true;

      this.variants.push({ blob, mat, count: 0, buffer: null });
    }

    const data = generateVegetationData();
    this.populateInstances(data.bushes);

    if (shadows) {
      for (const v of this.variants) {
        if (v.count > 0) {
          shadows.addShadowCaster(v.blob);
        }
      }
    }
  }

  private populateInstances(bushes: VegetationInstance[]): void {
    const radii = [1.2, 0.9, 0.65];

    const tempS = Vector3.Zero();
    const tempP = Vector3.Zero();
    const tempM = Matrix.Identity();

    for (const bush of bushes) {
      const v = bush.variant % 3;
      const bv = this.variants[v];
      const baseRadius = radii[v];

      const s = bush.scale;
      tempS.set(
        baseRadius * s * (0.8 + bush.phase * 0.4),
        baseRadius * s * (0.6 + bush.phase * 0.3),
        baseRadius * s * (0.8 + (1 - bush.phase) * 0.4),
      );
      tempP.set(bush.x, bush.y + baseRadius * s * 0.25, bush.z);
      Matrix.ComposeToRef(tempS, QY(bush.yaw), tempP, tempM);

      const idx = bv.count;
      const buf = this._ensureBuf(bv, idx);
      tempM.copyToArray(buf, idx * 16);
      bv.count++;
    }

    for (const bv of this.variants) {
      if (bv.count > 0 && bv.buffer) {
        bv.blob.thinInstanceSetBuffer("matrix", bv.buffer, 16, false);
      }
    }
  }

  private _ensureBuf(bv: BushVariant, idx: number): Float32Array {
    if (!bv.buffer || bv.buffer.length < (idx + 1) * 16) {
      const newLen = Math.max((idx + 1) * 16, (idx + 64) * 16);
      const newBuf = new Float32Array(newLen);
      if (bv.buffer) newBuf.set(bv.buffer);
      bv.buffer = newBuf;
    }
    return bv.buffer;
  }

  dispose(): void {
    if (this.disposed) return;
    this.disposed = true;
    for (const v of this.variants) {
      v.blob.dispose();
      v.mat.dispose();
    }
  }
}
