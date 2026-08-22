import type { RendererAdapter } from "./RendererAdapter";
import { WebGL2Adapter } from "./WebGL2Adapter";
import { Canvas2DAdapter } from "./canvas2d/Canvas2DAdapter";
import type { EngineMode } from "../engine/engineMode";

export function selectRenderer(mode: EngineMode): RendererAdapter {
  if (mode === "canvas2d") return new Canvas2DAdapter();
  return new WebGL2Adapter();
}
