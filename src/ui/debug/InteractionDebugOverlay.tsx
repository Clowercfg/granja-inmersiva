import { useEffect, useState } from "react";
import { getSnapshot, longTasks, type MetricSnapshot } from "../../core/bootMetrics";
import { useAuthStore } from "../../store/authStore";

const ORDER = [
  "boot_start",
  "main_module_eval",
  "react_first_render",
  "app_start",
  "canvas2d_scene_mount",
  "canvas_created",
  "renderer_ready",
  "listeners_installed",
  "canvas2d_initialized",
  "first_draw_real",
  "game_state_ready",
  "auth_started",
  "auth_completed",
  "canvas2d_booted",
  "first_pointerdown",
  "first_pointerup",
  "first_hit_test_done",
  "first_entity_detected",
  "first_action_completed",
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

  const rows: Array<[string, string]> = [
    ["First Draw", val("first_draw_real")],
    ["Listeners", val("listeners_installed")],
    ["Renderer", m["renderer_ready"] ? "ready" : "pending"],
    ["State", m["game_state_ready"] ? "ready" : "pending"],
    ["Auth API", authStatus === "authenticated" ? "ready" : authStatus],
    ["Auth t", val("auth_completed")],
    ["Scene mount", val("canvas2d_scene_mount")],
    ["First Input", val("first_pointerdown")],
    ["Hit Test", val("first_hit_test_done")],
    ["First Action", val("first_action_completed")],
  ];

  return (
    <div
      style={{
        position: "fixed",
        top: 8,
        left: 8,
        zIndex: 2147483647,
        background: "rgba(0,0,0,0.82)",
        color: "#7CFC00",
        fontFamily: "monospace",
        fontSize: 11,
        lineHeight: "15px",
        padding: "8px 10px",
        borderRadius: 6,
        pointerEvents: "none",
        whiteSpace: "pre",
      }}
    >
      <div style={{ color: "#FFD700", fontWeight: "bold" }}>INTERACTION DEBUG</div>
      {"\n"}
      FPS: {fps}  frame: {frameMs.toFixed(1)}ms{"\n"}
      {"─".repeat(26)}
      {"\n"}
      {rows.map(([k, v]) => (
        <span key={k}>
          {k.padEnd(14, " ")}
          {v}
          {"\n"}
        </span>
      ))}
      {"─".repeat(26)}
      {"\n"}
      LONG TASKS (&gt;50ms):{bigTasks.length === 0 ? " none" : "\n"}
      {bigTasks.map((t, i) => (
        <span key={i} style={{ color: t.duration > 200 ? "#FF5555" : "#FFAA00" }}>
          {`#${i + 1} @${t.start.toFixed(0)}ms ${t.duration.toFixed(0)}ms`}
          {"\n"}
        </span>
      ))}
    </div>
  );
}

export const METRIC_ORDER = ORDER;
