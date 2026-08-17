import { useEffect } from "react";
import { animalRegistry } from "../../store/farmStore";
import { useEconomyStore } from "../../store/economyStore";
import { useGoodsStore } from "../../store/goodsStore";
import { useWorldStore } from "../../store/worldStore";
import { PRODUCTION_PRICE } from "../../config/economy";

const EGG_PRODUCERS = new Set(["chicken", "rooster"]);

export function EconomySystem() {
  useEffect(() => {
    const iv = setInterval(() => {
      const world = useWorldStore.getState();
      if (world.paused) return;
      const eco = useEconomyStore.getState();
      const goods = useGoodsStore.getState();
      let income = 0;
      for (const a of animalRegistry.values()) {
        if (a.pendingProduction > 0) {
          if (EGG_PRODUCERS.has(a.kind)) {
            goods.addGoods("eggs", Math.floor(a.pendingProduction));
          } else {
            income += a.pendingProduction * PRODUCTION_PRICE[a.kind];
          }
          a.pendingProduction = 0;
        }
      }
      if (income > 0) eco.addGold(income, "producción");
    }, 4000);
    return () => clearInterval(iv);
  }, []);

  return null;
}
