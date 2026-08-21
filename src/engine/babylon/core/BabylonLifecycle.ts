import { Engine, Scene, Color4 } from "@babylonjs/core";
import type { ShadowGenerator } from "@babylonjs/core";
import { useWorldStore } from "../../../store/worldStore";
import { tickTimeSync } from "./TimeSync";

export interface BabylonSystem {
  init(scene: Scene, engine: Engine, shadows?: ShadowGenerator): void;
  update?(dt: number): void;
  dispose(): void;
}

export class BabylonLifecycle {
  public engine!: Engine;
  public scene!: Scene;
  public shadows: ShadowGenerator | null = null;
  private systems: BabylonSystem[] = [];
  private _running = false;
  private _lastTime = 0;
  private _frameCount = 0;
  private _fpsAccum = 0;
  private _ro: ResizeObserver;
  private _loopFn: () => void;
  private _firstFrameDone = false;
  private _onFirstFrame: (() => void) | null = null;

  constructor(canvas: HTMLCanvasElement) {
    this.engine = new Engine(canvas, true, {
      preserveDrawingBuffer: true,
      stencil: true,
      antialias: true,
    });
    this.scene = new Scene(this.engine);
    this.scene.clearColor = new Color4(0.66, 0.81, 0.9, 1);
    this._loopFn = this._renderLoop.bind(this);
    this._ro = new ResizeObserver(() => {
      if (canvas.parentElement) {
        this.engine.resize();
      }
    });
    this._ro.observe(canvas.parentElement ?? canvas);
  }

  onFirstFrame(cb: () => void): this {
    this._onFirstFrame = cb;
    return this;
  }

  addSystem(system: BabylonSystem): this {
    this.systems.push(system);
    system.init(this.scene, this.engine, this.shadows ?? undefined);
    return this;
  }

  start(): void {
    if (this._running) return;
    this._running = true;
    this._lastTime = performance.now();
    this._frameCount = 0;
    this._fpsAccum = 0;
    this.engine.runRenderLoop(this._loopFn);
  }

  stop(): void {
    if (!this._running) return;
    this._running = false;
    this.engine.stopRenderLoop(this._loopFn);
  }

  dispose(): void {
    this.stop();
    this._ro.disconnect();
    for (const sys of this.systems) sys.dispose();
    this.systems.length = 0;
    this.scene.dispose();
    this.engine.dispose();
  }

  private _renderLoop(): void {
    try {
      const now = performance.now();
      const dt = Math.min((now - this._lastTime) / 1000, 0.1);
      this._lastTime = now;

      tickTimeSync(dt);

      for (const sys of this.systems) {
        try {
          sys.update?.(dt);
        } catch (e) {
          console.warn("[BabylonLifecycle] system update error:", sys.constructor.name, e);
        }
      }

      this.scene.render();

      if (!this._firstFrameDone) {
        this._firstFrameDone = true;
        console.log("[BabylonLifecycle] first frame rendered successfully");
        this._onFirstFrame?.();
      }

      this._frameCount++;
      this._fpsAccum += dt;
      if (this._fpsAccum >= 0.5) {
        const fps = Math.round(this._frameCount / this._fpsAccum);
        useWorldStore.getState().setFps(fps);
        this._frameCount = 0;
        this._fpsAccum = 0;
      }
    } catch (e) {
      console.error("[BabylonLifecycle] render loop CRASH:", e);
      if (!this._firstFrameDone) {
        this._firstFrameDone = true;
        this._onFirstFrame?.();
      }
    }
  }
}
