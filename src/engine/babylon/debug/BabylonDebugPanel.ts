import { Engine, Scene } from "@babylonjs/core";
import type { BabylonSystem } from "../core/BabylonLifecycle";
import { useWorldStore } from "../../../store/worldStore";
import { useFarmStore } from "../../../store/farmStore";
import { useEconomyStore } from "../../../store/economyStore";
import { useCropStore } from "../../../store/cropStore";
import { STATIC_BUILDINGS } from "../../../config/layout";
import { timeManager } from "../../../systems/time/TimeManager";

const PANEL_ID = "babylon-debug-panel";
const UPDATE_INTERVAL_MS = 200;

export class BabylonDebugPanel implements BabylonSystem {
  private _engine!: Engine;
  private _scene!: Scene;
  private _container: HTMLDivElement | null = null;
  private _intervalId: ReturnType<typeof setInterval> | null = null;
  private _enabled = false;

  init(scene: Scene, engine: Engine): void {
    this._scene = scene;
    this._engine = engine;
    this._enabled = new URLSearchParams(window.location.search).get("debug") === "1";

    if (this._enabled) {
      this._createPanel();
      this._intervalId = setInterval(() => this._update(), UPDATE_INTERVAL_MS);
    }
  }

  update(_dt: number): void {
    if (!this._enabled || !this._container) return;
    const url = new URLSearchParams(window.location.search);
    const isDebug = url.get("debug") === "1";
    if (isDebug !== this._enabled) {
      if (isDebug) {
        this._enabled = true;
        this._createPanel();
        if (!this._intervalId) {
          this._intervalId = setInterval(() => this._update(), UPDATE_INTERVAL_MS);
        }
      } else {
        this.dispose();
      }
    }
  }

  dispose(): void {
    if (this._intervalId) {
      clearInterval(this._intervalId);
      this._intervalId = null;
    }
    if (this._container) {
      this._container.remove();
      this._container = null;
    }
    this._enabled = false;
  }

  private _createPanel(): void {
    if (this._container) return;

    const el = document.createElement("div");
    el.id = PANEL_ID;
    el.style.cssText = [
      "position:fixed",
      "top:12px",
      "right:12px",
      "z-index:99999",
      "background:rgba(0,0,0,0.75)",
      "color:#e0e0e0",
      "padding:12px 16px",
      "border-radius:6px",
      "font-family:'Courier New',Courier,monospace",
      "font-size:12px",
      "line-height:1.6",
      "pointer-events:none",
      "min-width:220px",
      "backdrop-filter:blur(4px)",
      "border:1px solid rgba(255,255,255,0.1)",
    ].join(";");
    el.textContent = "Loading debug info...";
    document.body.appendChild(el);
    this._container = el;
  }

  private _update(): void {
    if (!this._container || !this._engine || !this._scene) return;

    const fps = this._engine.getFps().toFixed(1);
    const meshCount = this._scene.meshes.length;
    const activeMeshes = this._scene.getActiveMeshes().length;

    let vertices = 0;
    for (const mesh of this._scene.meshes) {
      vertices += mesh.getTotalVertices();
    }

    const world = useWorldStore.getState();
    const farm = useFarmStore.getState();
    const crops = useCropStore.getState();
    const realDate = timeManager.getNow();

    const syncLines = [
      `<b style="color:#80d0ff">BABYLON DEBUG</b>`,
      `<span style="color:#888">─────────────────────</span>`,
      `FPS:      <span style="color:${Number(fps) < 30 ? "#ff5555" : Number(fps) < 55 ? "#ffaa33" : "#55ff55"}">${fps}</span>`,
      `Meshes:   ${meshCount}`,
      `Active:   ${activeMeshes}`,
      `Vertices: ${vertices.toLocaleString()}`,
      `<span style="color:#888">─────────────────────</span>`,
      `<b style="color:#c9a84c">SYNC DATA</b>`,
      `TIME SOURCE: worldStore`,
      `Hour: ${String(world.hour).padStart(2, "0")}:${String(world.minute).padStart(2, "0")}:${String(world.second).padStart(2, "0")}`,
      `Real: ${String(realDate.getHours()).padStart(2, "0")}:${String(realDate.getMinutes()).padStart(2, "0")}:${String(realDate.getSeconds()).padStart(2, "0")}`,
      `Season: ${world.season} | Weather: ${world.weather}`,
      `DayPhase: ${world.dayPhase}`,
      `<span style="color:#888">─────────────────────</span>`,
      `BUILDINGS: config=${STATIC_BUILDINGS.length}`,
      `ANIMALS:   ${farm.animals.length}`,
      `CROPS:     ${crops.planted.length}`,
      `Gold:      $${Math.round(useEconomyStore.getState().gold)}`,
    ];

    this._container.innerHTML = syncLines.join("<br>");
  }
}
