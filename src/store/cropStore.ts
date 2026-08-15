import { create } from "zustand";
import { getCropEconomy } from "../config/economy";
import { useEconomyStore } from "./economyStore";

export type CropState = "growing" | "ready";

export interface PlantedCrop {
  id: number;
  cropId: string;
  plotIndex: number;
  plantedAt: number;
  state: CropState;
}

export interface CropInventory {
  seeds: number;
  harvest: number;
}

/**
 * Economía de cultivos. Reglas:
 * - Comprar semillas descuenta su precio del saldo del jugador.
 * - La semilla se consume al sembrar (sin coste adicional).
 * - Tras `growthHours` (48 h para la zanahoria) el cultivo queda listo para cosechar.
 * - Al vender se añade el precio de venta por unidad al saldo.
 * - Semillas y cosechas en inventario NO se contabilizan como patrimonio monetario:
 *   solo se convierten en oro al vender.
 */
interface CropStore {
  inventory: Record<string, CropInventory>;
  planted: PlantedCrop[];
  nextId: number;
  /** Compra semillas: descuenta qty * seedPrice del saldo y las añade al inventario. */
  buySeed: (cropId: string, qty?: number) => boolean;
  /** Consume una semilla del inventario y registra la siembra (sin coste extra). */
  plantCrop: (cropId: string, plotIndex: number) => boolean;
  /** Actualiza el estado de los cultivos según el tiempo transcurrido. */
  tick: () => void;
  /** Si el cultivo está listo, lo mueve al inventario como cosecha. */
  harvestCrop: (id: number) => boolean;
  /** Vende cosecha del inventario: añade qty * sellPrice al saldo. */
  sellHarvest: (cropId: string, qty: number) => boolean;
}

const emptyInventory = (): CropInventory => ({ seeds: 0, harvest: 0 });

/** Semillas iniciales por cultivo (configurable). */
const STARTING_SEEDS: Record<string, number> = { carrot: 3 };

/** Milisegundos totales de crecimiento de un cultivo. */
export function growthMsOf(planted: Pick<PlantedCrop, "cropId">): number {
  const econ = getCropEconomy(planted.cropId);
  return econ ? econ.growthHours * 3600 * 1000 : 0;
}

/** Progreso de crecimiento 0..1 según el tiempo transcurrido. */
export function growthProgressOf(planted: PlantedCrop): number {
  const ms = growthMsOf(planted);
  return ms > 0 ? Math.min(1, (Date.now() - planted.plantedAt) / ms) : 1;
}

export const useCropStore = create<CropStore>((set, get) => ({
  inventory: Object.fromEntries(
    Object.entries(STARTING_SEEDS).map(([id, seeds]) => [id, { seeds, harvest: 0 }])
  ),
  planted: [],
  nextId: 1,

  buySeed: (cropId, qty = 1) => {
    const econ = getCropEconomy(cropId);
    if (!econ || qty <= 0) return false;
    const cost = econ.seedPrice * qty;
    if (!useEconomyStore.getState().spendGold(cost)) return false;
    set((s) => ({
      inventory: { ...s.inventory, [cropId]: { ...(s.inventory[cropId] ?? emptyInventory()), seeds: (s.inventory[cropId]?.seeds ?? 0) + qty } },
    }));
    return true;
  },

  plantCrop: (cropId, plotIndex) => {
    const econ = getCropEconomy(cropId);
    if (!econ) return false;
    if (get().planted.some((p) => p.plotIndex === plotIndex)) return false;
    const inv = get().inventory[cropId];
    if (!inv || inv.seeds < 1) return false;
    set((s) => ({
      inventory: {
        ...s.inventory,
        [cropId]: { ...(s.inventory[cropId] ?? emptyInventory()), seeds: (s.inventory[cropId]?.seeds ?? 0) - 1 },
      },
      planted: [
        ...s.planted,
        { id: s.nextId, cropId, plotIndex, plantedAt: Date.now(), state: "growing" },
      ],
      nextId: s.nextId + 1,
    }));
    return true;
  },

  tick: () => {
    const now = Date.now();
    const changed = get().planted.some((p) => {
      if (p.state === "ready") return false;
      const econ = getCropEconomy(p.cropId);
      return econ && now - p.plantedAt >= econ.growthHours * 3600 * 1000;
    });
    if (!changed) return;
    set((s) => ({
      planted: s.planted.map((p) => {
        if (p.state === "ready") return p;
        const econ = getCropEconomy(p.cropId);
        const ready = econ && now - p.plantedAt >= econ.growthHours * 3600 * 1000;
        return ready ? { ...p, state: "ready" } : p;
      }),
    }));
  },

  harvestCrop: (id) => {
    const planted = get().planted;
    const crop = planted.find((p) => p.id === id);
    if (!crop || crop.state !== "ready") return false;
    set((s) => ({
      planted: s.planted.filter((p) => p.id !== id),
      inventory: {
        ...s.inventory,
        [crop.cropId]: { ...(s.inventory[crop.cropId] ?? emptyInventory()), harvest: (s.inventory[crop.cropId]?.harvest ?? 0) + 1 },
      },
    }));
    return true;
  },

  sellHarvest: (cropId, qty) => {
    const econ = getCropEconomy(cropId);
    if (!econ || qty <= 0) return false;
    const inv = get().inventory[cropId];
    if (!inv || inv.harvest < qty) return false;
    useEconomyStore.getState().addGold(qty * econ.sellPrice, "cosecha");
    set((s) => ({
      inventory: {
        ...s.inventory,
        [cropId]: { ...(s.inventory[cropId] ?? emptyInventory()), harvest: (s.inventory[cropId]?.harvest ?? 0) - qty },
      },
    }));
    return true;
  },
}));
