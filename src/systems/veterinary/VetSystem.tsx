import { useEffect } from "react";
import { animalRegistry } from "../../store/farmStore";
import { useVetStore } from "../../store/vetStore";
import { useWorldStore } from "../../store/worldStore";
import { SICKNESS_ECONOMY } from "../../config/economy";

const DAY_MS = 86_400_000;

export function VetSystem() {
  useEffect(() => {
    const iv = setInterval(() => {
      if (useWorldStore.getState().paused) return;
      const now = Date.now();
      const vet = useVetStore.getState();

      // Los animales tratados terminan su recuperación y vuelven a estar sanos.
      for (const id of Object.keys(vet.sick)) {
        const entry = vet.sick[Number(id)];
        if (entry.recoverAt !== null && now >= entry.recoverAt) {
          vet.markRecovered(entry.id);
        }
      }

      // Probabilidad de enfermedad: tasa por animal/día repartida en la granja de
      // referencia; cada animal respeta su intervalo mínimo.
      const dtDays = (now - (vet.lastCheckAt || now)) / DAY_MS;
      useVetStore.setState({ lastCheckAt: now });
      const perAnimalPerDay =
        SICKNESS_ECONOMY.sickPerFarmDay / SICKNESS_ECONOMY.referenceFarmSize;

      for (const a of animalRegistry.values()) {
        if (vet.sick[a.id]) continue;
        const nextSick = vet.nextSickAt[a.id] ?? now + Math.random() * SICKNESS_ECONOMY.minSickIntervalDays * DAY_MS;
        if (now < nextSick) continue;
        if (Math.random() < perAnimalPerDay * dtDays) {
          vet.makeSick(a.id, a.kind);
          useVetStore.setState((s) => ({
            nextSickAt: { ...s.nextSickAt, [a.id]: now + SICKNESS_ECONOMY.minSickIntervalDays * DAY_MS },
          }));
        }
      }
    }, SICKNESS_ECONOMY.checkIntervalSeconds * 1000);
    return () => clearInterval(iv);
  }, []);

  return null;
}
