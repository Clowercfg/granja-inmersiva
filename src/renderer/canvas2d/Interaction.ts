import type { CameraState } from "./Camera2D";
import { zoomBy, panBy, screenToWorld } from "./Camera2D";
import { PLOTS } from "../../utils/terrainMath";
import { ENCLOSURES } from "../../config/enclosures";
import { STATIC_BUILDINGS } from "../../config/layout";
import { BUILDING_CONFIG } from "../../config/world";
import { POND } from "../../utils/terrainMath";
import { mark, remark } from "../../core/bootMetrics";
import { logTapTarget, recordPipelineStage, lastPipeline } from "../../core/bootMetrics";

function describeElement(el: Element | null): string {
  if (!el) return "null";
  const parts: string[] = [];
  let cur: Element | null = el;
  for (let i = 0; i < 4 && cur; i++) {
    const id = cur.id ? `#${cur.id}` : "";
    const cls = cur.className && typeof cur.className === "string" ? `.${cur.className.split(" ").slice(0, 2).join(".")}` : "";
    parts.push(`<${cur.tagName.toLowerCase()}>${id}${cls}`);
    cur = cur.parentElement;
  }
  return parts.join(" < ");
}

export interface HitResult {
  type: "plot" | "animal" | "building" | "pond" | "none";
  id: number | string;
  index: number;
  wx: number;
  wz: number;
}

export function hitTest(
  sx: number,
  sy: number,
  cam: CameraState,
  canvasW: number,
  canvasH: number,
  animalPositions: Array<{ id: number; x: number; z: number; kind: string }>
): HitResult {
  const [wx, wz] = screenToWorld(sx, sy, cam, canvasW, canvasH);

  const pd = Math.hypot(wx - POND.x, wz - POND.z);
  if (pd < POND.radius) {
    return { type: "pond", id: "pond", index: -1, wx, wz };
  }

  for (let i = 0; i < PLOTS.length; i++) {
    const p = PLOTS[i];
    if (Math.abs(wx - p.cx) < p.w / 2 && Math.abs(wz - p.cz) < p.d / 2) {
      return { type: "plot", id: i, index: i, wx, wz };
    }
  }

  for (const a of animalPositions) {
    const r = a.kind === "cow" ? 2.0 : a.kind === "pig" ? 1.5 : 1.0;
    if (Math.hypot(wx - a.x, wz - a.z) < r) {
      return { type: "animal", id: a.id, index: -1, wx, wz };
    }
  }

  for (const b of STATIC_BUILDINGS) {
    const size = BUILDING_CONFIG[b.type].size;
    const hw = size[0] / 2 + 2;
    const hd = size[1] / 2 + 2;
    if (Math.abs(wx - b.position[0]) < hw && Math.abs(wz - b.position[2]) < hd) {
      return { type: "building", id: b.uid, index: -1, wx, wz };
    }
  }

  for (let i = 0; i < PLOTS.length; i++) {
    const p = PLOTS[i];
    if (Math.abs(wx - p.cx) < p.w / 2 + 3 && Math.abs(wz - p.cz) < p.d / 2 + 3) {
      return { type: "plot", id: i, index: i, wx, wz };
    }
  }

  return { type: "none", id: -1, index: -1, wx, wz };
}

export function setupInteraction(
  canvas: HTMLCanvasElement,
  cam: CameraState,
  onHit: (result: HitResult) => void
): () => void {
  let dragging = false;
  let lastX = 0;
  let lastY = 0;
  let pinchDist = 0;
  let didDrag = false;

  const cw = () => canvas.width;
  const ch = () => canvas.height;

  let firstInputFired = false;

  const onPointerDown = (e: PointerEvent) => {
    recordPipelineStage("t0_pointerdown");
    for (const k of Object.keys(lastPipeline)) delete lastPipeline[k as keyof typeof lastPipeline];
    recordPipelineStage("t0_pointerdown");
    mark("first_pointerdown");
    if (!firstInputFired) {
      firstInputFired = true;
      logTapTarget(describeElement(document.elementFromPoint(e.clientX, e.clientY)));
      mark("canvas2d_first_input");
    }
    dragging = true;
    didDrag = false;
    lastX = e.clientX;
    lastY = e.clientY;
    canvas.setPointerCapture(e.pointerId);
  };

  const onPointerMove = (e: PointerEvent) => {
    if (!dragging) return;
    const dx = e.clientX - lastX;
    const dy = e.clientY - lastY;
    if (Math.abs(dx) > 2 || Math.abs(dy) > 2) didDrag = true;
    panBy(cam, dx, dy);
    lastX = e.clientX;
    lastY = e.clientY;
  };

  const onPointerUp = (e: PointerEvent) => {
    if (!dragging) return;
    dragging = false;
    canvas.releasePointerCapture(e.pointerId);
    if (!didDrag) {
      const tHit0 = performance.now();
      const rect = canvas.getBoundingClientRect();
      const sx = (e.clientX - rect.left) * (canvas.width / rect.width);
      const sy = (e.clientY - rect.top) * (canvas.height / rect.height);
      recordPipelineStage("t1_pointerup");
      mark("first_pointerup");
      const result = hitTest(sx, sy, cam, cw(), ch(), []);
      recordPipelineStage("t2_hitTest");
      remark("first_hit_test_done");
      console.log(`[interaction] pointerup→hitTest=${(performance.now() - tHit0).toFixed(2)}ms type=${result.type}`);
      onHit(result);
    }
  };

  const onWheel = (e: WheelEvent) => {
    e.preventDefault();
    zoomBy(cam, e.deltaY);
  };

  const onTouchStart = (e: TouchEvent) => {
    if (e.touches.length === 2) {
      const dx = e.touches[0].clientX - e.touches[1].clientX;
      const dy = e.touches[0].clientY - e.touches[1].clientY;
      pinchDist = Math.hypot(dx, dy);
    }
  };

  const onTouchMove = (e: TouchEvent) => {
    if (e.touches.length === 2) {
      e.preventDefault();
      const dx = e.touches[0].clientX - e.touches[1].clientX;
      const dy = e.touches[0].clientY - e.touches[1].clientY;
      const newDist = Math.hypot(dx, dy);
      const delta = pinchDist - newDist;
      zoomBy(cam, delta * 2);
      pinchDist = newDist;
    }
  };

  canvas.addEventListener("pointerdown", onPointerDown);
  canvas.addEventListener("pointermove", onPointerMove);
  canvas.addEventListener("pointerup", onPointerUp);
  canvas.addEventListener("wheel", onWheel, { passive: false });
  canvas.addEventListener("touchstart", onTouchStart, { passive: true });
  canvas.addEventListener("touchmove", onTouchMove, { passive: false });
  mark("listeners_installed");

  return () => {
    canvas.removeEventListener("pointerdown", onPointerDown);
    canvas.removeEventListener("pointermove", onPointerMove);
    canvas.removeEventListener("pointerup", onPointerUp);
    canvas.removeEventListener("wheel", onWheel);
    canvas.removeEventListener("touchstart", onTouchStart);
    canvas.removeEventListener("touchmove", onTouchMove);
  };
}
