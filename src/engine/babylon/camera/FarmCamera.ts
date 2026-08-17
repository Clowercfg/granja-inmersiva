import {
  Scene,
  Engine,
  ArcRotateCamera,
  Vector3,
} from "@babylonjs/core";
import type { ShadowGenerator } from "@babylonjs/core";
import { useCameraStore } from "../../../store/cameraStore";
import { BABYLON_CAMERA } from "../core/WorldConstants";
import type { BabylonSystem } from "../core/BabylonLifecycle";

export class FarmCamera implements BabylonSystem {
  private camera!: ArcRotateCamera;
  private unsubs: Array<() => void> = [];

  init(scene: Scene, engine: Engine, _shadows?: ShadowGenerator): void {
    const canvas = engine.getRenderingCanvas()!;
    const store = useCameraStore.getState();

    this.camera = new ArcRotateCamera(
      "farmCamera",
      -store.yaw,
      BABYLON_CAMERA.pitchDefault,
      store.distance,
      new Vector3(...store.target),
      scene,
    );

    this.camera.lowerRadiusLimit = BABYLON_CAMERA.distanceMin;
    this.camera.upperRadiusLimit = BABYLON_CAMERA.distanceMax;
    this.camera.lowerBetaLimit = BABYLON_CAMERA.pitchMin;
    this.camera.upperBetaLimit = BABYLON_CAMERA.pitchMax;
    this.camera.wheelPrecision = 1 / BABYLON_CAMERA.zoomSpeed;
    this.camera.pinchPrecision = 15;
    this.camera.angularSensibilityX = 1 / BABYLON_CAMERA.rotateSpeed;
    this.camera.angularSensibilityY = 1 / BABYLON_CAMERA.rotateSpeed;
    this.camera.inertia = 0.9;
    this.camera.panningSensibility = BABYLON_CAMERA.panSpeed;
    this.camera.panningInertia = 0.85;

    this.camera.attachControl(canvas, true);

    const camStore = useCameraStore.getState();
    this.camera.target = new Vector3(...camStore.target);
    this.camera.alpha = -camStore.yaw;
    this.camera.beta = BABYLON_CAMERA.pitchDefault;
    this.camera.radius = camStore.distance;

    this.unsubs.push(
      useCameraStore.subscribe((s, prev) => {
        if (s.target !== prev.target) {
          this.camera.target = new Vector3(...s.target);
        }
        if (s.yaw !== prev.yaw) {
          this.camera.alpha = -s.yaw;
        }
        if (s.pitch !== prev.pitch) {
          this.camera.beta = s.pitch;
        }
        if (s.distance !== prev.distance) {
          this.camera.radius = s.distance;
        }
      }),
    );

    scene.activeCamera = this.camera;
  }

  dispose(): void {
    for (const u of this.unsubs) u();
    this.unsubs.length = 0;
    this.camera?.dispose();
  }
}
