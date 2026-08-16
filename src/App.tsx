import { useState } from "react";
import { Experience } from "./core/world/Experience";
import { HUD } from "./ui/HUD";
import { Sidebar } from "./ui/sidebar/Sidebar";
import { Store } from "./ui/store/Store";
import { TransitionOverlay } from "./ui/TransitionOverlay";
import { CrateOverlay } from "./ui/CrateOverlay";
import { AuthPanel } from "./ui/auth/AuthPanel";
import { clearSession, readSession } from "./ui/auth/authStore";

export default function App() {
  const [user, setUser] = useState<string | null>(() => readSession()?.name ?? null);

  if (!user) {
    return <AuthPanel onSuccess={(name) => setUser(name)} />;
  }

  return (
    <>
      <Experience />
      <HUD onLogout={() => { clearSession(); setUser(null); }} />
      <Sidebar />
      <Store />
      <TransitionOverlay />
      <CrateOverlay />
    </>
  );
}
