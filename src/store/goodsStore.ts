import { create } from "zustand";
import { getGoodsEconomy } from "../config/economy";
import { useEconomyStore } from "./economyStore";

/** Stock inicial de productos del Almacén (configurable). */
const STARTING_GOODS: Record<string, number> = { milk: 6, eggs: 8, honey: 4, cheese: 5 };

interface GoodsStore {
  inventory: Record<string, number>;
  /** Vende producto del Almacén: añade qty * sellPrice al saldo. */
  sellGoods: (goodId: string, qty: number) => boolean;
  /** Añade producto al inventario (herramienta de prueba/depuración). */
  addGoods: (goodId: string, qty?: number) => boolean;
}

export const useGoodsStore = create<GoodsStore>((set, get) => ({
  inventory: { ...STARTING_GOODS },

  sellGoods: (goodId, qty) => {
    const econ = getGoodsEconomy(goodId);
    if (!econ || qty <= 0) return false;
    const inv = get().inventory;
    if ((inv[goodId] ?? 0) < qty) return false;
    useEconomyStore.getState().addGold(qty * econ.sellPrice, "producto");
    set((s) => ({ inventory: { ...s.inventory, [goodId]: (s.inventory[goodId] ?? 0) - qty } }));
    return true;
  },

  addGoods: (goodId, qty = 1) => {
    if (qty <= 0) return false;
    set((s) => ({ inventory: { ...s.inventory, [goodId]: (s.inventory[goodId] ?? 0) + qty } }));
    return true;
  },
}));
