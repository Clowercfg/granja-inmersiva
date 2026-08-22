const BOOT_START = performance.now();

const marks: Record<string, number> = {};
const log: Array<{ label: string; ms: number }> = [];
export const longTasks: Array<{ start: number; duration: number }> = [];

export interface PipelineRecord {
  t0_pointerdown: number;
  t1_pointerup: number;
  t2_hitTest: number;
  t3_entityFound: number;
  t4_actionStarted: number;
  t5_zustandSet: number;
  t6_subscriber: number;
  t7_rendererDetects: number;
  t8_renderStart: number;
  t9_renderEnd: number;
  t10_nextFrame: number;
  t11_visible: number;
}
export const lastPipeline: Partial<PipelineRecord> = {};
export const pipelineHistory: Array<{ totalMs: number; stages: string }> = [];
export const resizeLog: Array<{ t: number; w: number; h: number; dpr: number; reason: string }> = [];
export const tgEvents: Array<{ t: number; type: string; detail: string }> = [];
export const tapTargets: Array<{ t: number; chain: string }> = [];

export function recordPipelineStage<K extends keyof PipelineRecord>(stage: K): void {
  lastPipeline[stage] = performance.now();
}

export function logResize(w: number, h: number, dpr: number, reason: string): void {
  resizeLog.push({ t: performance.now() - BOOT_START, w, h, dpr, reason });
  if (resizeLog.length > 50) resizeLog.shift();
}

export function logTgEvent(type: string, detail: string): void {
  tgEvents.push({ t: performance.now() - BOOT_START, type, detail });
}

export function logTapTarget(chain: string): void {
  tapTargets.push({ t: performance.now() - BOOT_START, chain });
  if (tapTargets.length > 10) tapTargets.shift();
}

export interface MetricSnapshot {
  bootStartAbs: number;
  marks: Record<string, { abs: number; rel: number }>;
  longTasks: Array<{ start: number; duration: number }>;
}

export function mark(label: string): void {
  if (marks[label] !== undefined) return;
  marks[label] = performance.now();
}

export function remark(label: string): void {
  marks[label] = performance.now();
}

export function measure(label: string, startMark: string): number {
  const t = (marks[label] ?? performance.now()) - (marks[startMark] ?? 0);
  log.push({ label, ms: t });
  return t;
}

export function since(label: string): number {
  return performance.now() - (marks[label] ?? performance.now());
}

export function elapsed(label: string): number {
  return performance.now() - (marks[label] ?? performance.now());
}

export function getSnapshot(): MetricSnapshot {
  const out: Record<string, { abs: number; rel: number }> = {};
  for (const k in marks) {
    out[k] = { abs: BOOT_START + marks[k], rel: marks[k] };
  }
  return { bootStartAbs: BOOT_START, marks: out, longTasks };
}

export function hasMark(label: string): boolean {
  return marks[label] !== undefined;
}

export function dumpMetrics(): void {
  console.groupCollapsed("[boot] Performance Metrics");
  for (const k in marks) {
    console.log(`${k}: ${marks[k].toFixed(1)}ms (abs ${(BOOT_START + marks[k]).toFixed(0)})`);
  }
  for (const lt of longTasks) {
    console.log(`LONG TASK @${lt.start.toFixed(0)}ms duration=${lt.duration.toFixed(1)}ms`);
  }
  for (const { label, ms } of log) {
    console.log(`${label}: ${ms.toFixed(1)}ms`);
  }
  console.groupEnd();
}

if (typeof PerformanceObserver !== "undefined") {
  try {
    const po = new PerformanceObserver((list) => {
      for (const entry of list.getEntries()) {
        if (entry.duration > 50) {
          longTasks.push({ start: Math.max(0, entry.startTime - BOOT_START), duration: entry.duration });
          console.warn(`[boot] LONG TASK @${Math.max(0, entry.startTime - BOOT_START).toFixed(0)}ms dur=${entry.duration.toFixed(0)}ms`);
        }
      }
    });
    po.observe({ type: "longtask", buffered: true } as PerformanceObserverInit);
  } catch {
    /* longtask unsupported */
  }
}

mark("boot_start");
