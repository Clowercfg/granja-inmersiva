import { useEffect } from "react";
import { animalRegistry } from "../../store/farmStore";
import { useEconomyStore } from "../../store/economyStore";
import { useWorldStore } from "../../store/worldStore";

const PRICE: Record<"cow" | "chicken", number> = {
  cow: 2.4,
  chicken: 1.2,
};

export function EconomySystem() {
  useEffect(() => {
    const iv = setInterval(() => {
      const world = useWorldStore.getState();
      if (world.paused) return;
      const eco = useEconomyStore.getState();
      let income = 0;
      for (const a of animalRegistry.values()) {
        if (a.pendingProduction > 0) {
          income += a.pendingProduction * PRICE[a.kind];
          a.pendingProduction = 0;
        }
      }
      if (income > 0) eco.addGold(income, "producción");
    }, 4000);
    return () => clearInterval(iv);
  }, []);

  return null;
}
