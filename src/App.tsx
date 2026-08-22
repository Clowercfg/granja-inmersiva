import { Suspense, lazy, useEffect, useMemo } from "react";
import { HUD } from "./ui/HUD";
import { Sidebar } from "./ui/sidebar/Sidebar";
import { BottomBar } from "./ui/BottomBar";
import { Store } from "./ui/store/Store";
import { TransitionOverlay } from "./ui/TransitionOverlay";
import { CrateOverlay } from "./ui/CrateOverlay";
import { TelegramGate } from "./ui/auth/TelegramGate";
import { useAuthStore } from "./store/authStore";
import { getEngineMode } from "./engine/engineMode";
import { mark } from "./core/bootMetrics";
import { InteractionDebugOverlay } from "./ui/debug/InteractionDebugOverlay";

const AdminPanelLazy = lazy(() => import("./ui/admin/AdminPanel").then((m) => ({ default: m.AdminPanel })));
const AdminGateLazy = lazy(() => import("./ui/admin/AdminGate").then((m) => ({ default: m.AdminGate })));
const BabylonCanvasLazy = lazy(() =>
  import("./engine/babylon/BabylonCanvas").then((m) => ({ default: m.BabylonCanvas }))
);
const Canvas2DSceneLazy = lazy(() =>
  import("./core/world/Canvas2DScene").then((m) => ({ default: m.Canvas2DScene }))
);
const ExperienceLazy = lazy(() =>
  import("./core/world/Experience").then((m) => ({ default: m.Experience }))
);

const LoadingFallback = (
  <div style={{ position: "absolute", inset: 0, background: "#1a2a1a", color: "#c9a84c", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "sans-serif", fontSize: 18, zIndex: 99999 }}>
    Cargando...
  </div>
);

export default function App() {
  const engineMode = getEngineMode();
  const isAdmin = useMemo(() => window.location.pathname === "/admin", []);

  mark("app_start");
  mark("react_first_render");

  if (isAdmin) {
    return (
      <Suspense fallback={LoadingFallback}>
        <AdminGateLazy>
          <Suspense fallback={LoadingFallback}>
            <AdminPanelLazy />
          </Suspense>
        </AdminGateLazy>
      </Suspense>
    );
  }

  if (engineMode === "canvas2d") {
    return <Canvas2DApp />;
  }

  return (
    <TelegramGate>
      <AppContent engineMode={engineMode} />
    </TelegramGate>
  );
}

function Canvas2DApp() {
  const init = useAuthStore((s) => s.init);
  const status = useAuthStore((s) => s.status);

  useEffect(() => {
    if (status === "initializing") {
      init();
    }
  }, [status, init]);

  return <AppContent engineMode="canvas2d" />;
}

function AppContent({ engineMode }: { engineMode: "legacy" | "babylon" | "canvas2d" }) {
  const logout = useAuthStore((s) => s.logout);
  const authed = useAuthStore((s) => s.status === "authenticated");

  if (engineMode === "babylon") {
    return (
      <>
        <Suspense fallback={LoadingFallback}>
          <BabylonCanvasLazy />
        </Suspense>
        <HUD />
        <Sidebar />
        <BottomBar />
        <Store />
        <TransitionOverlay />
        <CrateOverlay />
      </>
    );
  }

  if (engineMode === "canvas2d") {
    return (
      <>
        <Suspense fallback={LoadingFallback}>
          <Canvas2DSceneLazy />
        </Suspense>
        {authed && <HUD />}
        <Sidebar />
        <BottomBar />
        <Store />
        <TransitionOverlay />
        <CrateOverlay />
        <InteractionDebugOverlay />
      </>
    );
  }

  return (
    <>
      <Suspense fallback={LoadingFallback}>
        <ExperienceLazy />
      </Suspense>
      {authed && <HUD />}
      <Sidebar />
      <BottomBar />
      <Store />
      <TransitionOverlay />
      <CrateOverlay />
    </>
  );
}
