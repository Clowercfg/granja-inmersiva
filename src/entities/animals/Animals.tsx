import { useEffect, useMemo } from "react";
import { useFarmStore } from "../../store/farmStore";
import { createRandom } from "../../systems/animalAI/ai";
import { spawnInitialAnimals } from "./spawn";
import { Animal } from "./Animal";

export function Animals() {
  const animals = useFarmStore((s) => s.animals);
  const rng = useMemo(() => createRandom(), []);

  useEffect(() => {
    spawnInitialAnimals();
    return () => useFarmStore.getState().clearAnimals();
  }, []);

  return (
    <group>
      {animals.map((a) => (
        <Animal key={a.id} id={a.id} />
      ))}
    </group>
  );
}
