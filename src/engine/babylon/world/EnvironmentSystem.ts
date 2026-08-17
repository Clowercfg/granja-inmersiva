import {
  Scene,
  Engine,
  MeshBuilder,
  VertexData,
  PBRMaterial,
  Color3,
  Vector3,
  Mesh,
  TransformNode,
} from "@babylonjs/core";
import type { ShadowGenerator } from "@babylonjs/core";
import type { BabylonSystem } from "../core/BabylonLifecycle";

export class EnvironmentSystem implements BabylonSystem {
  private starsMesh!: Mesh;

  init(scene: Scene, _engine: Engine, _shadows?: ShadowGenerator): void {
    const starCount = 200;
    const positions = new Float32Array(starCount * 3);
    const rng = this._seedRandom(99);

    for (let i = 0; i < starCount; i++) {
      const theta = rng() * Math.PI * 2;
      const phi = rng() * Math.PI * 0.4;
      const r = 280;
      positions[i * 3] = Math.sin(phi) * Math.cos(theta) * r;
      positions[i * 3 + 1] = Math.cos(phi) * r;
      positions[i * 3 + 2] = Math.sin(phi) * Math.sin(theta) * r;
    }

    const indices = new Uint16Array(starCount);
    for (let i = 0; i < starCount; i++) indices[i] = i;

    this.starsMesh = new Mesh("stars", scene);
    const vd = new VertexData();
    vd.positions = positions;
    vd.indices = indices;
    vd.applyToMesh(this.starsMesh);

    const starMat = new PBRMaterial("starMat", scene);
    starMat.emissiveColor = new Color3(1, 1, 0.9);
    starMat.albedoColor = new Color3(0, 0, 0);
    starMat.disableLighting = true;
    starMat.pointsCloud = true;
    starMat.pointSize = 3;
    this.starsMesh.material = starMat;
    this.starsMesh.hasVertexAlpha = false;
  }

  update(_dt: number): void {
  }

  dispose(): void {
    this.starsMesh?.dispose();
  }

  private _seedRandom(seed: number): () => number {
    let s = seed;
    return () => {
      s = (s * 16807 + 0) % 2147483647;
      return (s - 1) / 2147483646;
    };
  }
}
