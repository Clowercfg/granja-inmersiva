import { Suspense, lazy, useState } from "react";
import { Experience } from "./core/world/Experience";
import { HUD } from "./ui/HUD";
import { Sidebar } from "./ui/sidebar/Sidebar";
import { Store } from "./ui/store/Store";
import { TransitionOverlay } from "./ui/TransitionOverlay";
import { CrateOverlay } from "./ui/CrateOverlay";
import { DiamondPurchaseModal } from "./ui/store/DiamondPurchaseModal";
import { AuthPanel } from "./ui/auth/AuthPanel";
import { clearSession, readSession } from "./ui/auth/authStore";
import { getEngineMode } from "./engine/engineMode";

const BabylonCanvasLazy = lazy(() =>
  import("./engine/babylon/BabylonCanvas").then((m) => ({ default: m.BabylonCanvas }))
);

export default function App() {
  const [user, setUser] = useState<string | null>(() => readSession()?.name ?? null);
  const engineMode = getEngineMode();

  if (!user) {
    return <AuthPanel onSuccess={(name) => setUser(name)} />;
  }

  // ─── Modo Babylon (?engine=babylon) ───
  if (engineMode === "babylon") {
    return (
      <>
        <Suspense fallback={<div style={{ position: "fixed", inset: 0, background: "#1a2a1a", color: "#c9a84c", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "sans-serif", fontSize: 18, zIndex: 99999 }}>Cargando Babylon.js...</div>}>
          <BabylonCanvasLazy />
        </Suspense>
        <HUD onLogout={() => { clearSession(); setUser(null); }} />
        <Sidebar />
        <Store />
        <DiamondPurchaseModal />
        <TransitionOverlay />
        <CrateOverlay />
      </>
    );
  }

  // ─── Modo Legacy (predeterminado) ───
  return (
    <>
      <Experience />
      <HUD onLogout={() => { clearSession(); setUser(null); }} />
      <Sidebar />
      <Store />
      <DiamondPurchaseModal />
      <TransitionOverlay />
      <CrateOverlay />
    </>
  );
}
