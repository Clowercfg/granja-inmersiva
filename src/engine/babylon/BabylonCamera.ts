import { Scene, ArcRotateCamera, Vector3 } from "@babylonjs/core";

/**
 * Cámara ArcRotate para vista de simulador agrícola.
 * - Rotación libre 360°
 * - Zoom limitado (no atravesar terreno ni perder la granja)
 * - Panning con botón medio / Shift+click
 * - Límites de ángulo para no ver debajo del suelo
 */
export function createFarmCamera(scene: Scene): ArcRotateCamera {
  const camera = new ArcRotateCamera(
    "farmCamera",
    -Math.PI / 4,
    Math.PI / 3.5,
    120,
    Vector3.Zero(),
    scene
  );

  camera.lowerRadiusLimit = 30;
  camera.upperRadiusLimit = 350;

  camera.lowerBetaLimit = 0.2;
  camera.upperBetaLimit = Math.PI / 2.2;

  camera.panningSensibility = 40;
  camera.panningDistanceLimit = 180;

  camera.wheelPrecision = 0.5;
  camera.pinchPrecision = 15;
  camera.angularSensibilityX = 800;
  camera.angularSensibilityY = 800;

  camera.inertia = 0.85;
  camera.panningInertia = 0.85;

  camera.collisionRadius = new Vector3(2, 2, 2);
  camera.checkCollisions = false;

  camera.attachControl(scene.getEngine().getRenderingCanvas()!, true);

  return camera;
}
