import { Experience } from "./core/world/Experience";
import { HUD } from "./ui/HUD";
import { Sidebar } from "./ui/sidebar/Sidebar";
import { Store } from "./ui/store/Store";
import { TransitionOverlay } from "./ui/TransitionOverlay";
import { CrateOverlay } from "./ui/CrateOverlay";

export default function App() {
  return (
    <>
      <Experience />
      <HUD />
      <Sidebar />
      <Store />
      <TransitionOverlay />
      <CrateOverlay />
    </>
  );
}
