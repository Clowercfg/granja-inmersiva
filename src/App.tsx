import { Suspense, lazy, useMemo } from "react";
import { Experience } from "./core/world/Experience";
import { HUD } from "./ui/HUD";
import { Sidebar } from "./ui/sidebar/Sidebar";
import { BottomBar } from "./ui/BottomBar";
import { Store } from "./ui/store/Store";
import { TransitionOverlay } from "./ui/TransitionOverlay";
import { CrateOverlay } from "./ui/CrateOverlay";
import { TelegramGate } from "./ui/auth/TelegramGate";
import { AdminPanel } from "./ui/admin/AdminPanel";
import { AdminGate } from "./ui/admin/AdminGate";
import { useAuthStore } from "./store/authStore";
import { getEngineMode } from "./engine/engineMode";

const BabylonCanvasLazy = lazy(() =>
  import("./engine/babylon/BabylonCanvas").then((m) => ({ default: m.BabylonCanvas }))
);

export default function App() {
  const engineMode = getEngineMode();
  const isAdmin = useMemo(() => window.location.pathname === "/admin", []);

  if (isAdmin) return <AdminGate><AdminPanel /></AdminGate>;

  return (
    <TelegramGate>
      <AppContent engineMode={engineMode} />
    </TelegramGate>
  );
}

function AppContent({ engineMode }: { engineMode: string }) {
  const logout = useAuthStore((s) => s.logout);

  // ─── Modo Babylon (?engine=babylon) ───
  if (engineMode === "babylon") {
    return (
      <>
        <Suspense fallback={<div style={{ position: "absolute", inset: 0, background: "#1a2a1a", color: "#c9a84c", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "sans-serif", fontSize: 18, zIndex: 99999 }}>Cargando Babylon.js...</div>}>
          <BabylonCanvasLazy />
        </Suspense>
        <HUD onLogout={logout} />
        <Sidebar />
        <BottomBar />
        <Store />
        <TransitionOverlay />
        <CrateOverlay />
      </>
    );
  }

  // ─── Modo Legacy (predeterminado) ───
  return (
    <>
      <Experience />
      <HUD onLogout={logout} />
      <Sidebar />
      <BottomBar />
      <Store />
      <TransitionOverlay />
      <CrateOverlay />
    </>
  );
}
