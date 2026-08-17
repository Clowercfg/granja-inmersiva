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

const ROCK_COLOR = new Color3(0x7c / 255, 0x80 / 255, 0x74 / 255);

const QY = (angle: number) => Quaternion.RotationAxis(Vector3.Up(), angle);

interface RockVariant {
  mesh: Mesh;
  count: number;
  buffer: Float32Array | null;
}

export class RockSystem implements BabylonSystem {
  private scene!: Scene;
  private engine!: Engine;
  private variants: RockVariant[] = [];
  private mat!: PBRMaterial;
  private disposed = false;

  init(scene: Scene, engine: Engine, shadows?: ShadowGenerator): void {
    this.scene = scene;
    this.engine = engine;

    this.mat = new PBRMaterial("rockMat", scene);
    this.mat.albedoColor = ROCK_COLOR;
    this.mat.roughness = 1.0;
    this.mat.metallic = 0.05;

    const v0 = MeshBuilder.CreateIcoSphere("rockLarge", { radius: 1, subdivisions: 2 }, scene);
    v0.material = this.mat;
    v0.isVisible = false;
    v0.receiveShadows = true;

    const v1 = MeshBuilder.CreateIcoSphere("rockMedium", { radius: 1, subdivisions: 2 }, scene);
    v1.material = this.mat;
    v1.isVisible = false;
    v1.receiveShadows = true;

    const v2 = MeshBuilder.CreateIcoSphere("rockSmall", { radius: 1, subdivisions: 2 }, scene);
    v2.material = this.mat;
    v2.isVisible = false;
    v2.receiveShadows = true;

    this.variants = [
      { mesh: v0, count: 0, buffer: null },
      { mesh: v1, count: 0, buffer: null },
      { mesh: v2, count: 0, buffer: null },
    ];

    const data = generateVegetationData();
    this.populateInstances(data.rocks);

    if (shadows) {
      for (const v of this.variants) {
        if (v.count > 0) shadows.addShadowCaster(v.mesh);
      }
    }
  }

  private populateInstances(rocks: VegetationInstance[]): void {
    const radii = [1.0, 0.6, 0.3];

    const tempS = Vector3.Zero();
    const tempP = Vector3.Zero();
    const tempM = Matrix.Identity();

    for (const rock of rocks) {
      const v = rock.variant % 3;
      const rv = this.variants[v];
      const baseRadius = radii[v];

      const sx = baseRadius * rock.scale * (0.8 + (rock.phase * 0.4));
      const sy = baseRadius * rock.scale * (0.5 + (rock.phase * 0.3));
      const sz = baseRadius * rock.scale * (0.8 + ((1 - rock.phase) * 0.4));

      tempS.set(sx, sy, sz);
      tempP.set(rock.x, rock.y + sy * 0.15, rock.z);
      Matrix.ComposeToRef(tempS, QY(rock.yaw), tempP, tempM);

      const idx = rv.count;
      const buf = this._ensureBuf(rv, idx);
      tempM.copyToArray(buf, idx * 16);
      rv.count++;
    }

    for (const rv of this.variants) {
      if (rv.count > 0 && rv.buffer) {
        rv.mesh.thinInstanceSetBuffer("matrix", rv.buffer, 16, false);
      }
    }
  }

  private _ensureBuf(rv: RockVariant, idx: number): Float32Array {
    if (!rv.buffer || rv.buffer.length < (idx + 1) * 16) {
      const newLen = Math.max((idx + 1) * 16, (idx + 64) * 16);
      const newBuf = new Float32Array(newLen);
      if (rv.buffer) newBuf.set(rv.buffer);
      rv.buffer = newBuf;
    }
    return rv.buffer;
  }

  dispose(): void {
    if (this.disposed) return;
    this.disposed = true;
    for (const v of this.variants) v.mesh.dispose();
    this.mat.dispose();
  }
}
