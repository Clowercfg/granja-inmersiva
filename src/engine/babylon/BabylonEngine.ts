import { Engine, Scene } from "@babylonjs/core";

/**
 * Wrapper ligero para el motor Babylon.js.
 * - Crea el Engine y la Scene.
 * - Gestiona resize, render loop y dispose.
 */
export class BabylonFarmEngine {
  public engine: Engine;
  public scene: Scene;
  private _running = false;
  private _onResize: () => void;

  constructor(canvas: HTMLCanvasElement) {
    this.engine = new Engine(canvas, true, undefined, true);
    this.scene = new Scene(this.engine);

    this._onResize = () => this.engine.resize();
    window.addEventListener("resize", this._onResize);
  }

  start(): void {
    if (this._running) return;
    this._running = true;
    this.engine.runRenderLoop(() => {
      this.scene.render();
    });
  }

  stop(): void {
    if (!this._running) return;
    this._running = false;
    this.engine.stopRenderLoop();
  }

  dispose(): void {
    this.stop();
    window.removeEventListener("resize", this._onResize);
    this.scene.dispose();
    this.engine.dispose();
  }
}
