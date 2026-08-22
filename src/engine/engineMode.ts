export type EngineMode = "legacy" | "babylon" | "canvas2d";

export function getEngineMode(): EngineMode {
  if (typeof window === "undefined") return "legacy";
  const params = new URLSearchParams(window.location.search);
  const engine = params.get("engine");
  if (engine === "babylon") return "babylon";
  if (engine === "canvas2d") return "canvas2d";
  return "legacy";
}
