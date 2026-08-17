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

const FLOWER_COLORS = [
  new Color3(0xd6 / 255, 0x30 / 255, 0x31 / 255),
  new Color3(0xf9 / 255, 0xca / 255, 0x24 / 255),
  new Color3(0x6c / 255, 0x5c / 255, 0xe7 / 255),
];

const STEM_COLOR = new Color3(0x2a / 255, 0x5a / 255, 0x1a / 255);
const QY = (angle: number) => Quaternion.RotationAxis(Vector3.Up(), angle);

interface FlowerVariant {
  stem: Mesh;
  head: Mesh;
  stemMat: PBRMaterial;
  headMat: PBRMaterial;
  stemCount: number;
  headCount: number;
  stemBuffer: Float32Array | null;
  headBuffer: Float32Array | null;
}

export class FlowerSystem implements BabylonSystem {
  private scene!: Scene;
  private engine!: Engine;
  private variants: FlowerVariant[] = [];
  private disposed = false;

  init(scene: Scene, engine: Engine, _shadows?: ShadowGenerator): void {
    this.scene = scene;
    this.engine = engine;

    for (let v = 0; v < 3; v++) {
      const stemMat = new PBRMaterial(`flowerStemMat${v}`, scene);
      stemMat.albedoColor = STEM_COLOR;
      stemMat.roughness = 0.9;
      stemMat.metallic = 0;

      const headMat = new PBRMaterial(`flowerHeadMat${v}`, scene);
      headMat.albedoColor = FLOWER_COLORS[v];
      headMat.roughness = 0.7;
      headMat.metallic = 0.05;

      const stem = MeshBuilder.CreateCylinder(
        `flowerStem${v}`,
        { height: 1, diameterTop: 0.06, diameterBottom: 0.08, tessellation: 4 },
        scene,
      );
      stem.material = stemMat;
      stem.isVisible = false;

      const head = MeshBuilder.CreateSphere(
        `flowerHead${v}`,
        { diameter: 0.35, segments: 4 },
        scene,
      );
      head.material = headMat;
      head.isVisible = false;

      this.variants.push({
        stem,
        head,
        stemMat,
        headMat,
        stemCount: 0,
        headCount: 0,
        stemBuffer: null,
        headBuffer: null,
      });
    }

    const data = generateVegetationData();
    this.populateInstances(data.flowers);
  }

  private populateInstances(flowers: VegetationInstance[]): void {
    const tempS = Vector3.Zero();
    const tempP = Vector3.Zero();
    const tempM = Matrix.Identity();

    for (const flower of flowers) {
      const v = flower.variant % 3;
      const fv = this.variants[v];

      const s = flower.scale;
      tempS.set(s * 0.3, s * 0.8, s * 0.3);
      tempP.set(flower.x, flower.y + s * 0.4, flower.z);
      Matrix.ComposeToRef(tempS, QY(flower.yaw), tempP, tempM);

      const si = fv.stemCount;
      const sBuf = this._ensureBuf(fv, "stem", si);
      tempM.copyToArray(sBuf, si * 16);
      fv.stemCount++;

      tempS.set(s, s, s);
      tempP.set(flower.x, flower.y + s * 0.85, flower.z);
      Matrix.ComposeToRef(tempS, QY(flower.yaw), tempP, tempM);

      const hi = fv.headCount;
      const hBuf = this._ensureBuf(fv, "head", hi);
      tempM.copyToArray(hBuf, hi * 16);
      fv.headCount++;
    }

    for (const fv of this.variants) {
      if (fv.stemCount > 0 && fv.stemBuffer) {
        fv.stem.thinInstanceSetBuffer("matrix", fv.stemBuffer, 16, false);
      }
      if (fv.headCount > 0 && fv.headBuffer) {
        fv.head.thinInstanceSetBuffer("matrix", fv.headBuffer, 16, false);
      }
    }
  }

  private _ensureBuf(fv: FlowerVariant, which: "stem" | "head", idx: number): Float32Array {
    const key = which === "stem" ? "stemBuffer" : "headBuffer";
    let buf = fv[key];
    if (!buf || buf.length < (idx + 1) * 16) {
      const newLen = Math.max((idx + 1) * 16, (idx + 64) * 16);
      const newBuf = new Float32Array(newLen);
      if (buf) newBuf.set(buf);
      fv[key] = newBuf;
      buf = newBuf;
    }
    return buf;
  }

  dispose(): void {
    if (this.disposed) return;
    this.disposed = true;
    for (const v of this.variants) {
      v.stem.dispose();
      v.head.dispose();
      v.stemMat.dispose();
      v.headMat.dispose();
    }
  }
}
