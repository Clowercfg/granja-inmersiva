import { useEffect } from "react";
import { useWorldStore } from "../../store/worldStore";
import { useProcessingStore } from "../../store/processingStore";

export function ProcessingSystem() {
  useEffect(() => {
    const iv = setInterval(() => {
      const world = useWorldStore.getState();
      if (world.paused) return;
      useProcessingStore.getState().tick();
    }, 1000);
    return () => clearInterval(iv);
  }, []);

  return null;
}
