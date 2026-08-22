import { useEffect, useMemo } from "react";
import { useWorldStore } from "../store/worldStore";
import { animalRegistry } from "../store/farmStore";
import { updateAgent, createRandom, registerSeparation } from "../systems/animalAI/ai";
import { timeManager } from "../systems/time/TimeManager";
import { tickAtmosphere } from "../shaders/atmosphere";
import { onTick, startGameLoop, stopGameLoop } from "./gameLoop";

export function GameLogic() {
  const booted = useWorldStore((s) => s.booted);
  const rng = useMemo(() => createRandom(), []);

  useEffect(() => {
    if (!booted) return;

    const unsubs: (() => void)[] = [];

    unsubs.push(
      onTick((dt) => {
        timeManager.tick(dt);
        tickAtmosphere(dt);
      })
    );

    let lastSync = 0;
    unsubs.push(
      onTick(() => {
        const now = Date.now();
        if (now - lastSync >= 1000) {
          lastSync = now;
          useWorldStore.getState().syncClock(timeManager.getNow());
        }
      })
    );

    unsubs.push(
      onTick((dt) => {
        if (useWorldStore.getState().paused) return;
        const now = performance.now() / 1000;
        for (const a of animalRegistry.values()) {
          registerSeparation(a);
        }
        for (const a of animalRegistry.values()) {
          updateAgent(a, dt, rng, now);
        }
      })
    );

    startGameLoop();

    return () => {
      for (const u of unsubs) u();
      stopGameLoop();
    };
  }, [booted, rng]);

  return null;
}
