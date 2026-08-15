import { useEffect } from "react";
import { useCropStore } from "../../store/cropStore";
import { useWorldStore } from "../../store/worldStore";

/** Avanza el ciclo de crecimiento de los cultivos (marca listos tras growthHours). */
export function CropSystem() {
  useEffect(() => {
    const iv = setInterval(() => {
      if (useWorldStore.getState().paused) return;
      useCropStore.getState().tick();
    }, 1000);
    return () => clearInterval(iv);
  }, []);

  return null;
}
