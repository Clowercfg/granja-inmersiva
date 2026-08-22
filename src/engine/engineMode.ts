export type EngineMode = "legacy" | "babylon" | "canvas2d";

export function getEngineMode(): EngineMode {
  if (typeof window === "undefined") return "canvas2d";
  const params = new URLSearchParams(window.location.search);
  const engine = params.get("engine");
  if (engine === "babylon") return "babylon";
  if (engine === "legacy") return "legacy";
  return "canvas2d";
}
