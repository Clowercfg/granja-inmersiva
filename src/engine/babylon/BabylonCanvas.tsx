import { useEffect, useRef, useState } from "react";
import { BabylonLifecycle } from "./core/BabylonLifecycle";
import { initGameAdapter, disposeGameAdapter } from "./core/GameAdapter";
import { resetTimeSync } from "./core/TimeSync";
import { LightingSystem } from "./lighting/LightingSystem";
import { DayNightCycle } from "./lighting/DayNightCycle";
import { TerrainSystem } from "./world/TerrainSystem";
import { WaterSystem } from "./world/WaterSystem";
import { RoadSystem } from "./world/RoadSystem";
import { EnvironmentSystem } from "./world/EnvironmentSystem";
import { TreeSystem } from "./vegetation/TreeSystem";
import { GrassSystem } from "./vegetation/GrassSystem";
import { RockSystem } from "./vegetation/RockSystem";
import { FlowerSystem } from "./vegetation/FlowerSystem";
import { BushSystem } from "./vegetation/BushSystem";
import { BuildingSystem } from "./buildings/BuildingSystem";
import { EnclosureSystem } from "./buildings/EnclosureSystem";
import { AnimalSystem } from "./animals/AnimalSystem";
import { CropSystem } from "./crops/CropSystem";
import { WeatherSystem } from "./weather/WeatherSystem";
import { PickingSystem } from "./interaction/PickingSystem";
import { FarmCamera } from "./camera/FarmCamera";
import { BabylonDebugPanel } from "./debug/BabylonDebugPanel";
import { useWorldStore } from "../../store/worldStore";
import { useFarmStore } from "../../store/farmStore";
import { useCropStore } from "../../store/cropStore";
import { STATIC_BUILDINGS } from "../../config/layout";

export function BabylonCanvas() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [error, setError] = useState<string | null>(null);
  const disposedRef = useRef(false);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    disposedRef.current = false;

    let lifecycle: BabylonLifecycle | null = null;
    let safetyTimer: number | undefined;

    const timer = setTimeout(() => {
      if (disposedRef.current) return;
      try {
        console.log("[BabylonCanvas] init start, canvas:", canvas.clientWidth, "x", canvas.clientHeight);

        lifecycle = new BabylonLifecycle(canvas);
        console.log("[BabylonCanvas] Engine+Scene OK");

        const lighting = new LightingSystem();
        lifecycle.addSystem(lighting);
        lifecycle.shadows = lighting.getShadowGenerator();
        console.log("[BabylonCanvas] Lighting OK");

        lifecycle
          .addSystem(new TerrainSystem())
          .addSystem(new WaterSystem())
          .addSystem(new RoadSystem())
          .addSystem(new DayNightCycle())
          .addSystem(new EnvironmentSystem())
          .addSystem(new FarmCamera())
          .addSystem(new TreeSystem())
          .addSystem(new GrassSystem())
          .addSystem(new RockSystem())
          .addSystem(new FlowerSystem())
          .addSystem(new BushSystem())
          .addSystem(new BuildingSystem())
          .addSystem(new EnclosureSystem())
          .addSystem(new AnimalSystem())
          .addSystem(new CropSystem())
          .addSystem(new WeatherSystem())
          .addSystem(new PickingSystem())
          .addSystem(new BabylonDebugPanel());
        console.log("[BabylonCanvas] All systems OK");

        initGameAdapter();
        resetTimeSync();
        console.log("[BabylonCanvas] GameAdapter OK");

        const buildingCount = STATIC_BUILDINGS.length;
        const animalCount = useFarmStore.getState().animals.length;
        const cropCount = useCropStore.getState().planted.length;
        console.log(`[BABYLON SYNC] Config buildings: ${buildingCount} | Animals: ${animalCount} | Crops: ${cropCount}`);
        console.log(`[BABYLON SYNC] Time source: worldStore → hour=${useWorldStore.getState().hour} weather=${useWorldStore.getState().weather} season=${useWorldStore.getState().season}`);

        lifecycle
          .onFirstFrame(() => {
            if (disposedRef.current) return;
            console.log("[BabylonCanvas] FIRST FRAME → setBooted(true)");
            useWorldStore.getState().setBooted(true);
          })
          .start();
        console.log("[BabylonCanvas] Render loop started");

        safetyTimer = window.setTimeout(() => {
          if (!disposedRef.current && !useWorldStore.getState().booted) {
            console.warn("[BabylonCanvas] SAFETY: force setBooted(true) after 8s");
            useWorldStore.getState().setBooted(true);
          }
        }, 8000);
      } catch (err) {
        console.error("[BabylonCanvas] INIT FAILED:", err);
        if (!disposedRef.current) {
          useWorldStore.getState().setBooted(true);
          setError(String(err));
        }
      }
    }, 50);

    return () => {
      disposedRef.current = true;
      clearTimeout(timer);
      clearTimeout(safetyTimer);
      console.log("[BabylonCanvas] cleanup");
      useWorldStore.getState().setBooted(false);
      disposeGameAdapter();
      lifecycle?.dispose();
    };
  }, []);

  if (error) {
    return (
      <div style={{
        position: "absolute", inset: 0, zIndex: 99999,
        background: "#1a0a0a", color: "#ff6b6b",
        display: "flex", flexDirection: "column", alignItems: "center",
        justifyContent: "center", fontFamily: "monospace", fontSize: 14, padding: 40,
      }}>
        <div style={{ fontSize: 20, marginBottom: 16 }}>Error al inicializar Babylon.js</div>
        <pre style={{ maxWidth: 600, whiteSpace: "pre-wrap", textAlign: "center" }}>{error}</pre>
      </div>
    );
  }

  return (
    <div style={{ position: "absolute", inset: 0, zIndex: 0 }}>
      <canvas
        ref={canvasRef}
        style={{ width: "100%", height: "100%", display: "block", outline: "none" }}
      />
    </div>
  );
}
