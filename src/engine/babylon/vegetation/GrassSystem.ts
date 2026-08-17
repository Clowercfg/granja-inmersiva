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
import type { BabylonSystem } from "./TreeSystem";

const GRASS_COLOR = new Color3(0x3a / 255, 0x6b / 255, 0x22 / 255);
const GRASS_LOD_DISTANCE = 180;

function createBladeGeometry(scene: Scene): Mesh {
  const mesh = new Mesh("grassBlade", scene);

  const positions = new Float32Array([
    0, 0, 0,
    0.15, 0, 0,
    0.05, 0.5, 0,

    0.15, 0, 0,
    0.18, 0.55, 0,
    0.05, 0.5, 0,

    0.05, 0.5, 0,
    0.18, 0.55, 0,
    0.1, 1.0, 0,

    0.1, 1.0, 0,
    0.18, 0.55, 0,
    0.2, 0, 0,
  ]);

  const indices = new Uint16Array([
    0, 2, 1,
    1, 2, 3,
    3, 5, 4,
    4, 6, 5,
  ]);

  const normals: number[] = [];
  VertexData.ComputeNormals(positions, indices, normals);

  const vertexData = new VertexData();
  vertexData.positions = positions;
  vertexData.indices = indices;
  vertexData.normals = normals;
  vertexData.applyToMesh(mesh);

  mesh.isVisible = false;
  return mesh;
}

const QY = (angle: number) => Quaternion.RotationAxis(Vector3.Up(), angle);

export class GrassSystem implements BabylonSystem {
  private scene!: Scene;
  private engine!: Engine;
  private blade!: Mesh;
  private mat!: PBRMaterial;
  private bladeCount = 0;
  private matrixBuffer!: Float32Array;
  private cameraPos = Vector3.Zero();
  private disposed = false;

  init(scene: Scene, engine: Engine, _shadows?: ShadowGenerator): void {
    this.scene = scene;
    this.engine = engine;

    this.blade = createBladeGeometry(scene);

    this.mat = new PBRMaterial("grassMat", scene);
    this.mat.albedoColor = GRASS_COLOR;
    this.mat.roughness = 0.9;
    this.mat.metallic = 0;
    this.mat.backFaceCulling = false;
    this.mat.alphaCutOff = 0.4;
    this.mat.transparencyMode = 2;
    this.blade.material = this.mat;

    const data = generateVegetationData();
    this.populateInstances(data.grass);
  }

  private populateInstances(grass: VegetationInstance[]): void {
    this.bladeCount = grass.length;
    this.matrixBuffer = new Float32Array(this.bladeCount * 16);

    const tempS = Vector3.Zero();
    const tempP = Vector3.Zero();
    const tempM = Matrix.Identity();

    for (let i = 0; i < this.bladeCount; i++) {
      const g = grass[i];
      const s = g.scale;
      tempS.set(s * 0.5, s * 1.2, s * 0.5);
      tempP.set(g.x, g.y + s * 0.3, g.z);
      Matrix.ComposeToRef(tempS, QY(g.yaw), tempP, tempM);
      tempM.copyToArray(this.matrixBuffer, i * 16);
    }

    this.blade.thinInstanceSetBuffer("matrix", this.matrixBuffer, 16, false);
  }

  update(_dt: number): void {
    const activeCamera = this.scene.activeCamera;
    if (!activeCamera) return;
    this.cameraPos.copyFrom(activeCamera.position);

    const t = performance.now() * 0.001;
    const camX = this.cameraPos.x;
    const camZ = this.cameraPos.z;
    const maxDistSq = GRASS_LOD_DISTANCE * GRASS_LOD_DISTANCE;

    const tempPos = Vector3.Zero();
    const tempQuat = Quaternion.Identity();
    const tempScale = Vector3.One();

    for (let i = 0; i < this.bladeCount; i++) {
      const offset = i * 16;
      const m = Matrix.FromArray(this.matrixBuffer, offset);
      m.decompose(tempScale, tempQuat, tempPos);

      const dx = tempPos.x - camX;
      const dz = tempPos.z - camZ;
      const distSq = dx * dx + dz * dz;

      if (distSq > maxDistSq) {
        tempScale.set(0, 0, 0);
        Matrix.ComposeToRef(tempScale, tempQuat, tempPos, m);
        m.copyToArray(this.matrixBuffer, offset);
        continue;
      }

      const windX = Math.sin(t * 1.8 + tempPos.x * 0.15 + tempPos.z * 0.1) * 0.04;
      const windZ = Math.cos(t * 1.4 + tempPos.z * 0.12 + tempPos.x * 0.08) * 0.02;
      const gust = Math.sin(t * 0.6 + tempPos.x * 0.05) * 0.015;
      const totalWind = windX + windZ + gust;

      const swayPos = new Vector3(
        tempPos.x + totalWind,
        tempPos.y,
        tempPos.z + totalWind * 0.5,
      );
      Matrix.ComposeToRef(tempScale, tempQuat, swayPos, m);
      m.copyToArray(this.matrixBuffer, offset);
    }

    this.blade.thinInstanceSetBuffer("matrix", this.matrixBuffer, 16, false);
  }

  dispose(): void {
    if (this.disposed) return;
    this.disposed = true;
    this.blade.dispose();
    this.mat.dispose();
  }
}
