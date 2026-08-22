import { useEffect, useRef } from "react";
import { Canvas2DAdapter } from "../../renderer/canvas2d/Canvas2DAdapter";
import { useWorldStore } from "../../store/worldStore";
import { useFarmStore } from "../../store/farmStore";
import { useUiStore } from "../../store/uiStore";
import { timeManager } from "../../systems/time/TimeManager";
import { tickAtmosphere } from "../../shaders/atmosphere";
import { startGameLoop, stopGameLoop, onTick } from "../gameLoop";
import { createRandom, updateAgent, registerSeparation } from "../../systems/animalAI/ai";
import { animalRegistry } from "../../store/farmStore";
import { spawnInitialAnimals } from "../../entities/animals/spawn";
import { mark } from "../bootMetrics";
import { trackStoreSet } from "../bootMetrics";
import { installTgInstrumentation } from "../tgDebug";

export function Canvas2DScene() {
  const containerRef = useRef<HTMLDivElement>(null);
  const adapterRef = useRef<Canvas2DAdapter | null>(null);

  useEffect(() => {
    if (!containerRef.current) return;
    mark("canvas2d_scene_mount");
    installTgInstrumentation();
    console.log(`[Canvas2D] scene mount, time since app_start: ${performance.now().toFixed(0)}ms`);

    const adapter = new Canvas2DAdapter();
    adapterRef.current = adapter;
    adapter.initialize(containerRef.current);

    useWorldStore.getState().setBooted(true);
    mark("canvas2d_booted");

    const rng = createRandom();
    spawnInitialAnimals();
    mark("game_state_ready");

    const unsubs: (() => void)[] = [];
    unsubs.push(onTick((dt) => {
      timeManager.tick(dt);
      tickAtmosphere(dt);
    }));
    let lastClockSync = 0;
    unsubs.push(onTick(() => {
      const now = performance.now();
      if (now - lastClockSync >= 250) {
        lastClockSync = now;
        useWorldStore.getState().syncClock(timeManager.getNow());
        trackStoreSet("world");
      }
    }));
    unsubs.push(onTick((dt) => {
      if (useWorldStore.getState().paused) return;
      const now = performance.now() / 1000;
      for (const a of animalRegistry.values()) registerSeparation(a);
      for (const a of animalRegistry.values()) updateAgent(a, dt, rng, now);
    }));
    startGameLoop();

    return () => {
      for (const u of unsubs) u();
      stopGameLoop();
      adapter.destroy();
      adapterRef.current = null;
      useFarmStore.getState().clearAnimals();
    };
  }, []);

  return (
    <div
      ref={containerRef}
      style={{
        position: "absolute",
        inset: 0,
        width: "100%",
        height: "100%",
        overflow: "hidden",
        background: "#4d7c33",
      }}
      onClick={() => useUiStore.getState().closeOverlays()}
    />
  );
}
