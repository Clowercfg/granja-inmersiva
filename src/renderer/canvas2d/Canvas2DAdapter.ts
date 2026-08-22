import type { RendererAdapter, CropState, AnimalState, BuildingState } from "../RendererAdapter";
import type { CameraState } from "./Camera2D";
import { createCamera, centerOnFarm, worldToScreen } from "./Camera2D";
import { setupInteraction, type HitResult } from "./Interaction";
import { renderFrame, init as initRenderer, destroy as destroyRenderer } from "./Renderer2D";
import { invalidateTerrainCache } from "./TerrainRenderer";
import { isStressMode, runStressTests } from "./StressTestRunner";
import { useCropStore, type PlantedCrop } from "../../store/cropStore";
import { useFarmStore, animalRegistry } from "../../store/farmStore";
import { useWorldStore } from "../../store/worldStore";
import { useUiStore } from "../../store/uiStore";
import { mark, remark, dumpMetrics, hasMark, recordPipelineStage, lastPipeline, pipelineHistory, logResize, type PipelineRecord } from "../../core/bootMetrics";
import { preloadSceneSprites, spritesLoadedCount } from "./spriteCatalog";

function fmt(v: number | null): string {
  return v === null || v === undefined ? "—" : (v as number).toFixed(1);
}

function diff(a: number | undefined, b: number | undefined): number | null {
  if (a === undefined || b === undefined) return null;
  return b - a;
}

function t10Value(): number | undefined {
  return lastPipeline.t10_nextFrame;
}

export class Canvas2DAdapter implements RendererAdapter {
  private container: HTMLElement | null = null;
  private canvas: HTMLCanvasElement | null = null;
  private ctx: CanvasRenderingContext2D | null = null;
  private cam: CameraState = createCamera();

  getCam(): CameraState {
    return this.cam;
  }

  getCanvasEl(): HTMLCanvasElement | null {
    return this.canvas;
  }
  private rafId = 0;
  private running = false;
  private selectedId: number | string | null = null;
  private selectedType: string | null = null;
  private cleanupInteraction: (() => void) | null = null;
  private lastDpr = 1;
  private firstFrameDone = false;
  private debugFlash: { plotIndex: number; until: number } | null = null;
  private lastPlantedRef: readonly unknown[] | null = null;
  private cropMapVersion = 0;
  private lastRenderMs = 0;
  private pendingVisibleCheck = false;

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

    useCropStore.subscribe(() => {
      recordPipelineStage("t6_subscriber");
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
    invalidateTerrainCache();
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
    const newW = Math.floor(rect.width * dpr);
    const newH = Math.floor(rect.height * dpr);
    if (this.canvas.width !== newW || this.canvas.height !== newH) {
      const duringFlash = this.debugFlash && performance.now() < this.debugFlash.until;
      logResize(newW, newH, dpr, duringFlash ? "container-resize-DURING-FLASH" : "container-resize");
    }
    this.canvas.width = newW;
    this.canvas.height = newH;
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
      preloadSceneSprites();
      const started = performance.now();
      const checkLoaded = (): void => {
        if (spritesLoadedCount() >= 46 || performance.now() - started > 15000) {
          remark("sprites_ready");
          console.log(`[sprites] ${spritesLoadedCount()}/46 loaded in ${(performance.now() - started).toFixed(0)}ms (visualtest=${new URLSearchParams(location.search).get("visualtest")})`);
        } else {
          requestAnimationFrame(checkLoaded);
        }
      };
      requestAnimationFrame(checkLoaded);
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

    if (this.lastPlantedRef !== cropStore.planted && this.lastPlantedRef !== null) {
      recordPipelineStage("t7_rendererDetects");
      remark("renderer_detected_change");
    }

    const animalList = animals.values();
    const animalPositions: Array<{ id: number; x: number; z: number; kind: string }> = [];
    for (const a of animalList) {
      animalPositions.push({ id: a.id, x: a.position[0], z: a.position[2], kind: a.kind });
    }

    const cropMap: Record<number, PlantedCrop> = {};
    for (const c of cropStore.planted) {
      cropMap[c.plotIndex] = c;
    }
    this.lastPlantedRef = cropStore.planted;
    this.cropMapVersion++;

    recordPipelineStage("t8_renderStart");
    const tRender0 = performance.now();
    renderFrame(
      this.canvas,
      this.cam,
      cropMap,
      Array.from(animals.values()),
      0.5,
      this.debugFlash
    );
    this.lastRenderMs = performance.now() - tRender0;
    recordPipelineStage("t9_renderEnd");
  }

  private onHit(hit: HitResult): void {
    const t0 = performance.now();
    if (!hasMark("first_entity_detected") && hit.type !== "none") mark("first_entity_detected");
    if (hit.type === "none") {
      this.selectedId = null;
      this.selectedType = null;
      return;
    }
    recordPipelineStage("t3_entityFound");

    this.selectedId = hit.id;
    this.selectedType = hit.type;

    if (hit.type === "plot") {
      recordPipelineStage("t4_actionStarted");
      this.debugFlash = { plotIndex: hit.index, until: performance.now() + 1000 };
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
      recordPipelineStage("t5_zustandSet");
    }

    remark("first_action_completed");
    console.log(`[interaction] hit→action total=${(performance.now() - t0).toFixed(2)}ms (${hit.type})`);
    this.scheduleVisibleCheck();
  }

  private scheduleVisibleCheck(): void {
    if (this.pendingVisibleCheck) return;
    this.pendingVisibleCheck = true;
    requestAnimationFrame(() => {
      recordPipelineStage("t10_nextFrame");
      requestAnimationFrame(() => {
        recordPipelineStage("t11_visible");
        this.pendingVisibleCheck = false;
        this.printPipeline();
      });
    });
  }

  private printPipeline(): void {
    const p = lastPipeline;
    const rel = (k: keyof PipelineRecord): number | null =>
      p.t0_pointerdown !== undefined && p[k] !== undefined ? (p[k] as number) - p.t0_pointerdown : null;
    const total = rel("t11_visible");
    const stages = [
      `pointer→action=${fmt(rel("t4_actionStarted"))}`,
      `action→state=${fmt(diff(p.t4_actionStarted, p.t5_zustandSet))}`,
      `state→subscriber=${fmt(diff(p.t5_zustandSet, p.t6_subscriber))}`,
      `state→renderer=${fmt(diff(p.t5_zustandSet, p.t7_rendererDetects))}`,
      `renderMs=${this.lastRenderMs.toFixed(1)}`,
      `frame=${fmt(diff(p.t9_renderEnd, t10Value()))}`,
      `TOTAL TOUCH→VISIBLE=${total === null ? "—" : total.toFixed(1) + "ms"}`,
    ].join(" | ");
    pipelineHistory.push({ totalMs: total ?? -1, stages });
    if (pipelineHistory.length > 20) pipelineHistory.shift();
    console.log(`[pipeline] ${stages}`);
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
