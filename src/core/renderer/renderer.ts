import * as THREE from "three";
import { useWorldStore } from "../../store/worldStore";
import { mark } from "../bootMetrics";

export type RendererLike = THREE.WebGLRenderer;

const PREF_KEY = "ifs-renderer";

export function webgpuSupported(): boolean {
  if (typeof navigator === "undefined" || !("gpu" in navigator)) return false;
  try {
    const adapter = (navigator as unknown as { gpu?: { requestAdapter?: unknown } }).gpu;
    return !!adapter && !!adapter.requestAdapter;
  } catch {
    return false;
  }
}

export function preferWebgpu(): boolean {
  try {
    const params = new URLSearchParams(window.location.search);
    if (params.get("webgpu") === "0") return false;
    const stored = localStorage.getItem(PREF_KEY);
    if (stored === "1") return true;
    if (stored === "0") return false;
    return params.get("webgpu") === "1";
  } catch {
    return false;
  }
}

export function setRendererPreference(prefer: boolean): void {
  try {
    localStorage.setItem(PREF_KEY, prefer ? "1" : "0");
  } catch {
    /* ignore */
  }
}

export interface RendererProps {
  canvas: HTMLCanvasElement;
  powerPreference?: string;
  antialias?: boolean;
  alpha?: boolean;
}

function isMobile(): boolean {
  return typeof navigator !== "undefined" && /Mobi|Android|iPhone|iPad/i.test(navigator.userAgent);
}

export async function createRenderer(props: RendererProps): Promise<RendererLike> {
  const canvas = props.canvas;
  const useWebgpu = preferWebgpu() && webgpuSupported();
  if (useWebgpu) {
    try {
      const { WebGPURenderer } = await import("three/webgpu");
      const renderer = new WebGPURenderer({
        canvas,
        antialias: true,
        powerPreference: "high-performance",
      }) as unknown as THREE.WebGLRenderer;
      await (renderer as unknown as { init?: () => Promise<void> }).init?.();
      configureWebgpu(renderer);
      useWorldStore.getState().setRendererMode("webgpu");
      mark("webgpu_ready");
      return renderer;
    } catch (err) {
      console.warn("[renderer] WebGPU no disponible, usando WebGL2.", err);
    }
  }
  const renderer = new THREE.WebGLRenderer({
    canvas,
    antialias: true,
    alpha: false,
    stencil: true,
    powerPreference: "high-performance",
  });
  configureWebgl(renderer);
  useWorldStore.getState().setRendererMode("webgl");
  mark("webgl_ready");
  return renderer;
}

function configureWebgl(renderer: THREE.WebGLRenderer): void {
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.05;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  const maxDpr = isMobile() ? 1.5 : 2;
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, maxDpr));
}

function configureWebgpu(renderer: RendererLike): void {
  const r = renderer as unknown as {
    outputColorSpace?: string;
    toneMapping?: number;
    toneMappingExposure?: number;
    setPixelRatio?: (v: number) => void;
  };
  r.outputColorSpace = THREE.SRGBColorSpace;
  r.toneMapping = THREE.ACESFilmicToneMapping;
  r.toneMappingExposure = 1.05;
  const maxDpr = isMobile() ? 1.5 : 2;
  r.setPixelRatio?.(Math.min(window.devicePixelRatio, maxDpr));
}
