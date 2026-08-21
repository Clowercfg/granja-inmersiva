import { Engine, Scene } from "@babylonjs/core";

/**
 * Wrapper ligero para el motor Babylon.js.
 * - Crea el Engine y la Scene.
 * - Gestiona resize via ResizeObserver (no window), render loop y dispose.
 */
export class BabylonFarmEngine {
  public engine: Engine;
  public scene: Scene;
  private _running = false;
  private _ro: ResizeObserver;

  constructor(canvas: HTMLCanvasElement) {
    this.engine = new Engine(canvas, true, undefined, true);
    this.scene = new Scene(this.engine);

    this._ro = new ResizeObserver(() => {
      if (canvas.parentElement) {
        this.engine.resize();
      }
    });
    this._ro.observe(canvas.parentElement ?? canvas);
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
    this._ro.disconnect();
    this.scene.dispose();
    this.engine.dispose();
  }
}
