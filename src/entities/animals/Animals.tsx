import { useEffect, useMemo } from "react";
import { useFrame } from "@react-three/fiber";
import { useFarmStore, animalRegistry } from "../../store/farmStore";
import { useWorldStore } from "../../store/worldStore";
import { updateAgent, createRandom, registerSeparation } from "../../systems/animalAI/ai";
import { spawnInitialAnimals } from "./spawn";
import { Animal } from "./Animal";

export function Animals() {
  const animals = useFarmStore((s) => s.animals);
  const rng = useMemo(() => createRandom(), []);

  useEffect(() => {
    spawnInitialAnimals();
    return () => useFarmStore.getState().clearAnimals();
  }, []);

  useFrame((_, rawDelta) => {
    if (useWorldStore.getState().paused) return;
    const dt = Math.min(rawDelta, 0.05);
    const now = performance.now() / 1000;
    for (const a of animalRegistry.values()) {
      registerSeparation(a);
    }
    for (const a of animalRegistry.values()) {
      updateAgent(a, dt, rng, now);
    }
  });

  return (
    <group>
      {animals.map((a) => (
        <Animal key={a.id} id={a.id} />
      ))}
    </group>
  );
}
