/**
 * Detecta el motor gráfico solicitado via query string.
 *
 * - Sin parámetro o `?engine=legacy` → motor actual (Three.js / R3F)
 * - `?engine=babylon` → motor Babylon.js
 *
 * Legacy es siempre el modo por defecto.
 */
export function getEngineMode(): "legacy" | "babylon" {
  if (typeof window === "undefined") return "legacy";
  const params = new URLSearchParams(window.location.search);
  const engine = params.get("engine");
  if (engine === "babylon") return "babylon";
  return "legacy";
}
