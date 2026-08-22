import { useEffect, useState } from "react";
import {
  getSnapshot,
  longTasks,
  lastPipeline,
  pipelineHistory,
  resizeLog,
  tgEvents,
  tapTargets,
  type MetricSnapshot,
} from "../../core/bootMetrics";
import { useAuthStore } from "../../store/authStore";

const ORDER = [
  "boot_start",
  "main_module_eval",
  "app_start",
  "canvas2d_scene_mount",
  "renderer_ready",
  "listeners_installed",
  "first_draw_real",
  "game_state_ready",
  "auth_completed",
];

function isInteractionDebug(): boolean {
  return new URLSearchParams(window.location.search).get("interactiondebug") === "true";
}

export function InteractionDebugOverlay() {
  const [enabled] = useState(isInteractionDebug);
  const [snap, setSnap] = useState<MetricSnapshot | null>(null);
  const [fps, setFps] = useState(0);
  const [frameMs, setFrameMs] = useState(0);
  const authStatus = useAuthStore((s) => s.status);

  useEffect(() => {
    if (!enabled) return;
    const id = window.setInterval(() => setSnap(getSnapshot()), 250);
    return () => window.clearInterval(id);
  }, [enabled]);

  useEffect(() => {
    if (!enabled) return;
    let frames = 0;
    let last = performance.now();
    let raf = 0;
    const tick = () => {
      frames++;
      const now = performance.now();
      if (now - last >= 1000) {
        setFps(Math.round((frames * 1000) / (now - last)));
        setFrameMs((now - last) / frames);
        frames = 0;
        last = now;
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [enabled]);

  if (!enabled || !snap) return null;

  const m = snap.marks;
  const val = (k: string) => (m[k] ? `${m[k].rel.toFixed(0)}ms` : "—");
  const bigTasks = [...longTasks].sort((a, b) => b.duration - a.duration).slice(0, 5);

  const rel = (k: keyof typeof lastPipeline): number | null =>
    lastPipeline.t0_pointerdown !== undefined && lastPipeline[k] !== undefined
      ? (lastPipeline[k] as number) - (lastPipeline.t0_pointerdown as number)
      : null;
  const totalVisible = rel("t11_visible");

  const tgState = getTgInfo();

  const rows: Array<[string, string]> = [
    ["First Draw", val("first_draw_real")],
    ["Listeners", val("listeners_installed")],
    ["Renderer", m["renderer_ready"] ? "ready" : "pending"],
    ["State", m["game_state_ready"] ? "ready" : "pending"],
    ["Auth API", authStatus === "authenticated" ? "ready" : authStatus],
    ["First Input", val("first_pointerdown")],
    ["Hit Test", val("first_hit_test_done")],
  ];

  const pipelineRows: Array<[string, string]> = [
    ["T0→T4 action", fmtMs(rel("t4_actionStarted"))],
    ["T4→T5 state", diff(lastPipeline.t4_actionStarted, lastPipeline.t5_zustandSet)],
    ["T5→T6 subscriber", diff(lastPipeline.t5_zustandSet, lastPipeline.t6_subscriber)],
    ["T5→T7 renderer", diff(lastPipeline.t5_zustandSet, lastPipeline.t7_rendererDetects)],
    ["T8 render", lastPipeline.t8_renderStart !== undefined && lastPipeline.t9_renderEnd !== undefined ? `${(lastPipeline.t9_renderEnd - lastPipeline.t8_renderStart).toFixed(1)}ms` : "—"],
    ["T9→T10 frame", diff(lastPipeline.t9_renderEnd, lastPipeline.t10_nextFrame)],
    ["T10→T11 visible", diff(lastPipeline.t10_nextFrame, lastPipeline.t11_visible)],
    ["TOTAL touch→visible", totalVisible !== null ? `${totalVisible.toFixed(1)}ms` : "—"],
  ];

  return (
    <div
      style={{
        position: "fixed",
        top: 8,
        left: 8,
        zIndex: 2147483647,
        background: "rgba(0,0,0,0.85)",
        color: "#7CFC00",
        fontFamily: "monospace",
        fontSize: 11,
        lineHeight: "15px",
        padding: "8px 10px",
        borderRadius: 6,
        pointerEvents: "none",
        whiteSpace: "pre",
        maxWidth: "92vw",
        overflow: "hidden",
      }}
    >
      <div style={{ color: "#FFD700", fontWeight: "bold" }}>INTERACTION DEBUG v2</div>
      {"\n"}
      FPS: {fps}  frame: {frameMs.toFixed(1)}ms{"\n"}
      {"─".repeat(30)}
      {"\n"}
      {rows.map(([k, v]) => (
        <span key={k}>
          {k.padEnd(16, " ")}
          {v}
          {"\n"}
        </span>
      ))}
      <span style={{ color: "#00D0FF" }}>
        {"═".repeat(30)}
        {"\n"}
        PIPELINE (última acción)
        {"\n"}
      </span>
      {pipelineRows.map(([k, v]) => (
        <span key={k}>
          {k.padEnd(22, " ")}
          {v}
          {"\n"}
        </span>
      ))}
      {pipelineHistory.length > 1 ? (
        <span style={{ color: "#AAAAAA" }}>
          {`acciones: ${pipelineHistory.length}, última TOTAL ${totalVisible !== null ? totalVisible.toFixed(0) : "?"}ms`}
          {"\n"}
        </span>
      ) : null}
      <span style={{ color: "#FF9900" }}>
        {"═".repeat(30)}
        {"\n"}
        RESIZE: {resizeLog.length}  TG-events: {tgEvents.length}
        {"\n"}
      </span>
      {resizeLog.slice(-3).map((r, i) => (
        <span key={i} style={{ color: "#FF9900" }}>
          {`#${resizeLog.length - Math.min(3, resizeLog.length) + i + 1} @${r.t.toFixed(0)}ms ${r.w}x${r.h} ${r.reason}`}
          {"\n"}
        </span>
      ))}
      {tgEvents.slice(-2).map((e, i) => (
        <span key={i} style={{ color: "#CC88FF" }}>
          {`TG @${e.t.toFixed(0)}ms ${e.type} ${e.detail}`}
          {"\n"}
        </span>
      ))}
      <span style={{ color: "#66AAFF" }}>
        {"─".repeat(30)}
        {"\n"}
        TG: {tgState.present ? `${tgState.platform}/${tgState.version}` : "no-sdk"} vp={tgState.viewportH}
        {"\n"}
      </span>
      {tapTargets.length > 0 ? (
        <span style={{ color: "#FFFFFF" }}>
          tap→ {tapTargets[tapTargets.length - 1].chain.slice(0, 90)}
          {"\n"}
        </span>
      ) : null}
      {"─".repeat(30)}
      {"\n"}
      LONG TASKS &gt;50ms: {bigTasks.length === 0 ? "none" : "\n"}
      {bigTasks.map((t, i) => (
        <span key={i} style={{ color: t.duration > 200 ? "#FF5555" : "#FFAA00" }}>
          {`#${i + 1} @${t.start.toFixed(0)}ms ${t.duration.toFixed(0)}ms`}
          {"\n"}
        </span>
      ))}
    </div>
  );
}

function fmtMs(v: number | null): string {
  return v === null ? "—" : `${v.toFixed(1)}ms`;
}

function diff(a: number | undefined, b: number | undefined): string {
  if (a === undefined || b === undefined) return "—";
  return `${(b - a).toFixed(1)}ms`;
}

function getTgInfo() {
  try {
    const w = window as unknown as {
      innerHeight: number;
      Telegram?: { WebApp?: { platform?: string; version?: string } };
    };
    const tg = w.Telegram?.WebApp;
    return {
      present: !!tg,
      platform: tg?.platform ?? "—",
      version: tg?.version ?? "—",
      viewportH: w.innerHeight,
    };
  } catch {
    return { present: false, platform: "?", version: "?", viewportH: 0 };
  }
}

export const METRIC_ORDER = ORDER;
