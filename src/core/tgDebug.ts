import { logTgEvent, logResize } from "./bootMetrics";

interface TgWebAppInfo {
  platform?: string;
  version?: string;
  viewportStableHeight?: number;
  isExpanded?: boolean;
  initDataUnsafe?: { user?: { id?: number; first_name?: string } };
}

let resizeCount = 0;
let viewportChangeCount = 0;
let installed = false;

export function getTgDebugState(): {
  present: boolean;
  platform: string;
  version: string;
  viewportH: number | null;
  stableH: number | null;
  isExpanded: boolean | null;
  resizeCount: number;
  viewportChangeCount: number;
} {
  const tg = (window as unknown as { Telegram?: { WebApp?: TgWebAppInfo & { onEvent?: (e: string, cb: () => void) => void } } }).Telegram?.WebApp;
  return {
    present: !!tg,
    platform: tg?.platform ?? "—",
    version: tg?.version ?? "—",
    viewportH: typeof window !== "undefined" ? window.innerHeight : null,
    stableH: tg?.viewportStableHeight ?? null,
    isExpanded: tg?.isExpanded ?? null,
    resizeCount,
    viewportChangeCount,
  };
}

export function installTgInstrumentation(): void {
  if (installed) return;
  installed = true;

  window.addEventListener("resize", () => {
    resizeCount++;
    logResize(
      Math.floor(window.innerWidth * (window.devicePixelRatio || 1)),
      Math.floor(window.innerHeight * (window.devicePixelRatio || 1)),
      window.devicePixelRatio || 1,
      `window-resize#${resizeCount}`
    );
    logTgEvent("window-resize", `inner=${window.innerWidth}x${window.innerHeight} dpr=${(window.devicePixelRatio || 1).toFixed(2)}`);
  });

  const tg = (window as unknown as { Telegram?: { WebApp?: TgWebAppInfo & { onEvent?: (e: string, cb: () => void) => void } } }).Telegram?.WebApp;
  if (!tg) {
    logTgEvent("sdk", "Telegram.WebApp NOT present");
    return;
  }
  logTgEvent("sdk", `platform=${tg.platform} version=${tg.version} stableH=${tg.viewportStableHeight} expanded=${tg.isExpanded}`);
  if (typeof tg.onEvent === "function") {
    try {
      tg.onEvent("viewportChanged", () => {
        viewportChangeCount++;
        logTgEvent("viewportChanged", `inner=${window.innerWidth}x${window.innerHeight}`);
      });
      tg.onEvent("contentSafeAreaChanged", () => {
        viewportChangeCount++;
        logTgEvent("contentSafeAreaChanged", "");
      });
    } catch {
      logTgEvent("sdk", "onEvent registration failed");
    }
  }
}
