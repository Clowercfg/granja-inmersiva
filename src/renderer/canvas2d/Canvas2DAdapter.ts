import type { RendererAdapter, CropState, AnimalState, BuildingState } from "../RendererAdapter";
import type { CameraState } from "./Camera2D";
import { createCamera, centerOnFarm, worldToScreen } from "./Camera2D";
import { setupInteraction, type HitResult } from "./Interaction";
import { renderFrame, init as initRenderer, destroy as destroyRenderer } from "./Renderer2D";
import { isStressMode, runStressTests } from "./StressTestRunner";
import { useCropStore, type PlantedCrop } from "../../store/cropStore";
import { useFarmStore, animalRegistry } from "../../store/farmStore";
import { useWorldStore } from "../../store/worldStore";
import { useUiStore } from "../../store/uiStore";
import { mark, remark, dumpMetrics, hasMark, getSnapshot } from "../../core/bootMetrics";

function fmt(v: number | null): string {
  return v === null ? "—" : v.toFixed(1);
}

export class Canvas2DAdapter implements RendererAdapter {
  private container: HTMLElement | null = null;
  private canvas: HTMLCanvasElement | null = null;
  private ctx: CanvasRenderingContext2D | null = null;
  private cam: CameraState = createCamera();
  private rafId = 0;
  private running = false;
  private selectedId: number | string | null = null;
  private selectedType: string | null = null;
  private cleanupInteraction: (() => void) | null = null;
  private lastDpr = 1;
  private firstFrameDone = false;

  initialize(container: HTMLElement): void {
    const t0 = performance.now();
    this.container = container;

    const canvas = document.createElement("canvas");
    canvas.style.width = "100%";
    canvas.style.height = "100%";
    canvas.style.display = "block";
    canvas.style.touchAction = "none";
    container.appendChild(canvas);
    this.canvas = canvas;
    mark("canvas_created");

    this.ctx = canvas.getContext("2d");
    if (!this.ctx) throw new Error("Canvas2D: context unavailable");
    initRenderer(canvas);
    mark("renderer_ready");

    this.resize();
    centerOnFarm(this.cam);
    mark("canvas2d_initialized");

    this.cleanupInteraction = setupInteraction(canvas, this.cam, (hit: HitResult) => {
      this.onHit(hit);
    });

    window.addEventListener("resize", this.onResize);
    this.running = true;
    this.loop();

    console.log(`[Canvas2D] initialized in ${(performance.now() - t0).toFixed(1)}ms`);

    if (isStressMode() && this.canvas && this.ctx) {
      this.running = false;
      if (this.rafId) cancelAnimationFrame(this.rafId);
      console.log("[Canvas2D] Stress mode detected — pausing normal loop, running stress tests...");
      runStressTests(this.canvas, this.ctx, this.cam).then(() => {
        console.log("[Canvas2D] Stress tests complete — resuming normal loop");
        this.running = true;
        this.loop();
      });
    }
  }

  destroy(): void {
    this.running = false;
    if (this.rafId) cancelAnimationFrame(this.rafId);
    this.cleanupInteraction?.();
    window.removeEventListener("resize", this.onResize);
    if (this.canvas && this.container) {
      this.container.removeChild(this.canvas);
    }
    this.canvas = null;
    this.ctx = null;
    this.container = null;
    destroyRenderer();
  }

  private onResize = (): void => {
    this.resize();
  };

  private resize(): void {
    if (!this.canvas || !this.container) return;
    const rect = this.container.getBoundingClientRect();
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    this.lastDpr = dpr;
    this.canvas.width = Math.floor(rect.width * dpr);
    this.canvas.height = Math.floor(rect.height * dpr);
    if (this.ctx) {
      this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    }
  }

  update(_dt: number): void {}

  private loop = (): void => {
    if (!this.running) return;
    const t0 = performance.now();
    this.draw();
    if (!this.firstFrameDone) {
      this.firstFrameDone = true;
      mark("first_draw_real");
      console.log(`[Canvas2D] REAL first frame painted at ${t0.toFixed(0)}ms, draw took ${(performance.now() - t0).toFixed(1)}ms`);
      dumpMetrics();
    }
    this.rafId = requestAnimationFrame(this.loop);
  };

  private draw(): void {
    if (!this.ctx || !this.canvas) return;
    const rect = this.canvas.getBoundingClientRect();
    const w = rect.width;
    const h = rect.height;

    const cropStore = useCropStore.getState();
    const animals = animalRegistry;

    const animalList = animals.values();
    const animalPositions: Array<{ id: number; x: number; z: number; kind: string }> = [];
    for (const a of animalList) {
      animalPositions.push({ id: a.id, x: a.position[0], z: a.position[2], kind: a.kind });
    }

    const cropMap: Record<number, PlantedCrop> = {};
    for (const c of cropStore.planted) {
      cropMap[c.plotIndex] = c;
    }

    renderFrame(
      this.canvas,
      this.cam,
      cropMap,
      Array.from(animals.values()),
      0.5
    );
  }

  private onHit(hit: HitResult): void {
    const t0 = performance.now();
    if (!hasMark("first_entity_detected") && hit.type !== "none") mark("first_entity_detected");
    if (hit.type === "none") {
      this.selectedId = null;
      this.selectedType = null;
      return;
    }

    this.selectedId = hit.id;
    this.selectedType = hit.type;

    if (hit.type === "plot") {
      const cropStore = useCropStore.getState();
      const crop = cropStore.planted.find((c) => c.plotIndex === hit.index);
      if (crop && crop.state === "ready") {
        cropStore.harvestCrop(crop.id);
      } else if (!crop) {
        const cropId = this.getCropForPlot(hit.index);
        if (cropId) {
          cropStore.plantCrop(cropId, hit.index);
        }
      }
    }

    remark("first_action_completed");
    console.log(`[interaction] hit→action total=${(performance.now() - t0).toFixed(2)}ms (${hit.type})`);
    console.log(`[interaction] pipeline: pointerdown=${fmt(this.marksDiff("first_pointerdown", "first_pointerup"))}ms hitTest=${fmt(this.marksDiff("first_pointerup", "first_hit_test_done"))}ms action=${fmt(this.marksDiff("first_hit_test_done", "first_action_completed"))}ms`);
  }

  private marksDiff(a: string, b: string): number | null {
    const snapA = getSnapshot().marks[a];
    const snapB = getSnapshot().marks[b];
    if (!snapA || !snapB) return null;
    return snapB.rel - snapA.rel;
  }

  private getCropForPlot(plotIndex: number): string | null {
    const PLOT_CROPS: Array<{ plotIndex: number; cropId: string }> = [
      { plotIndex: 0, cropId: "wheat" },
      { plotIndex: 1, cropId: "corn" },
      { plotIndex: 2, cropId: "carrot" },
      { plotIndex: 3, cropId: "potato" },
    ];
    const match = PLOT_CROPS.find((p) => p.plotIndex === plotIndex);
    return match?.cropId ?? null;
  }

  addCrop(_crop: CropState): void {}
  updateCrop(_crop: CropState): void {}
  removeCrop(_id: number): void {}

  addAnimal(_animal: AnimalState): void {}
  updateAnimal(_animal: AnimalState): void {}
  removeAnimal(_id: number): void {}

  addBuilding(_building: BuildingState): void {}
  updateBuilding(_building: BuildingState): void {}
  removeBuilding(_id: string): void {}
}
