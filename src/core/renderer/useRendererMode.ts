import { useWorldStore } from "../../store/worldStore";

export function useRendererMode(): "webgpu" | "webgl" {
  return useWorldStore((s) => s.rendererMode);
}
