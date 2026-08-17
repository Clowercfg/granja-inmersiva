import {
  Scene,
  Engine,
  MeshBuilder,
  PBRMaterial,
  Color3,
} from "@babylonjs/core";
import type { BabylonSystem } from "../core/BabylonLifecycle";
import { POND, WATER_Y } from "./terrainMath";

export class WaterSystem implements BabylonSystem {
  private mesh: any = null;
  private mat: PBRMaterial | null = null;
  private time = 0;

  init(scene: Scene, _engine: Engine): void {
    this.mesh = MeshBuilder.CreateDisc(
      "water",
      { radius: POND.radius + 3, tessellation: 64 },
      scene,
    );
    this.mesh.rotation.x = -Math.PI / 2;
    this.mesh.position.set(POND.x, WATER_Y, POND.z);

    this.mat = new PBRMaterial("waterMat", scene);
    this.mat.albedoColor = new Color3(0.11, 0.29, 0.23);
    this.mat.emissiveColor = new Color3(0.03, 0.06, 0.06);
    this.mat.roughness = 0.05;
    this.mat.metallic = 0.1;
    this.mat.alpha = 0.85;
    this.mat.backFaceCulling = false;
    this.mesh.material = this.mat;
  }

  update(dt: number): void {
    if (!this.mesh) return;
    this.time += dt;
    this.mesh.position.y = WATER_Y + Math.sin(this.time * 1.2) * 0.04;
  }

  dispose(): void {
    this.mat?.dispose();
    this.mesh?.dispose();
  }
}
