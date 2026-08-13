import { Experience } from "./core/world/Experience";
import { HUD } from "./ui/HUD";
import { Sidebar } from "./ui/sidebar/Sidebar";
import { TransitionOverlay } from "./ui/TransitionOverlay";

export default function App() {
  return (
    <>
      <Experience />
      <HUD />
      <Sidebar />
      <TransitionOverlay />
    </>
  );
}
