/**
 * SISTEMA DE COMPRA DE LA TIENDA.
 *
 * Lógica económica separada de la interfaz: aquí se validan saldo, capacidad
 * y se ejecutan las compras reales (descontar dinero, crear animales, añadir
 * semillas). La UI de la tienda solo llama a estas funciones y muestra
 * resultados; nunca decide precios ni cantidades.
 *
 * Seguridad:
 * - Los precios se resuelven desde la economía central (nunca del cliente).
 * - Las compras de combos recalculan el descuento y lo recortan al máximo
 *   permitido (10%): un descuento manipulado nunca supera el límite.
 * - Cantidades negativas, fraccionarias o cero se rechazan.
 */
import { create } from "zustand";
import type { AnimalKind } from "../types";
import { getCropEconomy, getAnimalEconomy } from "../config/economy";
import {
  getOffer,
  offerNormalPrice,
  offerSalePrice,
  effectiveDiscount,
  type OfferDef,
} from "../config/offers";
import { useEconomyStore } from "./economyStore";
import { useUpgradesStore } from "./upgradesStore";
import { useFarmStore } from "./farmStore";
import { useCropStore } from "./cropStore";
import { useLanguageStore } from "./languageStore";
import { createAnimalAgent } from "../entities/animals/spawn";

export interface ShopResult {
  ok: boolean;
  message: string;
  detail?: string;
  /** Nombre corto del producto para la animación de compra (fx). */
  fxLabel?: string;
}

/** Traducción global (el idioma se lee en el momento de la llamada). */
function tr(key: string, params?: Record<string, string | number>): string {
  return useLanguageStore.getState().t(key, params);
}

/** Edificio de mejoras que aloja cada especie (gallinero/establo/pocilga). */
const BUILDING_OF_KIND: Record<AnimalKind, string> = {
  cow: "stable",
  chicken: "coop",
  rooster: "coop",
  pig: "pigPen",
};

const KIND_NAME: Record<AnimalKind, string> = {
  cow: "VACA",
  chicken: "GALLINA",
  rooster: "GALLO",
  pig: "CERDO",
};

const counters: Record<AnimalKind, number> = { cow: 0, chicken: 0, rooster: 0, pig: 0 };

function animalName(kind: AnimalKind): string {
  counters[kind] += 1;
  return `${KIND_NAME[kind]} #${String(counters[kind]).padStart(3, "0")}`;
}

/** Capacidad del edificio que aloja la especie y animales que ya lo ocupan. */
export function capacityFor(kind: AnimalKind): { building: string; capacity: number; used: number } {
  const building = BUILDING_OF_KIND[kind];
  const capacity = useUpgradesStore.getState().capacityOf(building);
  const used = useFarmStore
    .getState()
    .animals.filter((a) => BUILDING_OF_KIND[a.kind] === building).length;
  return { building, capacity, used };
}

function invalidQty(qty: number): boolean {
  return !Number.isFinite(qty) || Math.floor(qty) !== qty || qty <= 0;
}

function insufficient(cost: number): ShopResult {
  const available = useEconomyStore.getState().gold;
  return {
    ok: false,
    message: tr("shop.insufficient"),
    detail: tr("shop.insufficient_detail", {
      need: `$${cost.toFixed(2)}`,
      have: `$${available.toFixed(2)}`,
    }),
  };
}

function noCapacity(building: string, capacity: number, needed: number): ShopResult {
  return {
    ok: false,
    message: tr("shop.capacity"),
    detail: tr("shop.capacity_detail", {
      free: capacity - needed < 0 ? 0 : capacity - needed,
      building: tr(`building.${building}`),
    }),
  };
}

/** Comprueba que los animales de un combo quepan en sus edificios. */
export function validateAnimalCapacity(items: OfferDef["items"]): ShopResult | null {
  const neededByBuilding: Record<string, number> = {};
  for (const item of items) {
    if (item.type !== "animal" || item.qty <= 0) continue;
    const { building } = capacityFor(item.kind);
    neededByBuilding[building] = (neededByBuilding[building] ?? 0) + item.qty;
  }
  for (const [building, needed] of Object.entries(neededByBuilding)) {
    const anyKind = (Object.keys(BUILDING_OF_KIND) as AnimalKind[]).find(
      (k) => BUILDING_OF_KIND[k] === building
    );
    if (!anyKind) continue;
    const cap = capacityFor(anyKind);
    if (cap.used + needed > cap.capacity) {
      return noCapacity(building, cap.capacity, needed);
    }
  }
  return null;
}

interface ShopStore {
  buySeed: (cropId: string, qty: number) => ShopResult;
  buyAnimal: (kind: AnimalKind, qty: number) => ShopResult;
  buyCombo: (comboId: string) => ShopResult;
}

export const useShopStore = create<ShopStore>((_set, _get) => ({
  buySeed: (cropId, qty) => {
    if (invalidQty(qty)) {
      return { ok: false, message: tr("shop.invalid_qty"), detail: tr("shop.invalid_qty_detail") };
    }
    const def = getCropEconomy(cropId);
    if (!def) return { ok: false, message: tr("shop.unavailable") };
    const cost = def.seedPrice * qty;
    const ok = useCropStore.getState().buySeed(cropId, qty);
    if (!ok) return insufficient(cost);
    return {
      ok: true,
      message: tr("shop.seeds_bought"),
      detail: tr("shop.seeds_bought_detail", { qty, name: tr(`crop.${cropId}`) }),
      fxLabel: tr(`crop.${cropId}`),
    };
  },

  buyAnimal: (kind, qty) => {
    if (invalidQty(qty)) {
      return { ok: false, message: tr("shop.invalid_qty"), detail: tr("shop.invalid_qty_detail") };
    }
    const def = getAnimalEconomy(kind);
    if (!def) return { ok: false, message: tr("shop.unavailable") };
    const cap = capacityFor(kind);
    if (cap.used + qty > cap.capacity) return noCapacity(cap.building, cap.capacity, qty);
    const cost = def.price * qty;
    if (!useEconomyStore.getState().spendGold(cost)) return insufficient(cost);
    const farm = useFarmStore.getState();
    for (let i = 0; i < qty; i++) farm.registerAnimal(createAnimalAgent(kind, animalName(kind)));
    return {
      ok: true,
      message: tr("shop.animal_bought", {
        name: tr(`animal.${kind}`).toUpperCase(),
        suffix: kind === "cow" ? "A" : "O",
      }),
      detail: tr("shop.animal_bought_detail", { qty, money: `$${(def.price * qty).toFixed(2)}` }),
      fxLabel: tr(`animal.${kind}`),
    };
  },

  buyCombo: (comboId) => {
    const def = getOffer(comboId);
    if (!def) return { ok: false, message: tr("shop.offer_unavailable") };
    const sale = offerSalePrice(def);
    const normal = offerNormalPrice(def);
    const discount = effectiveDiscount(def);

    const capErr = validateAnimalCapacity(def.items);
    if (capErr) return capErr;

    if (!useEconomyStore.getState().spendGold(sale)) return insufficient(sale);

    const farm = useFarmStore.getState();
    for (const item of def.items) {
      if (item.qty <= 0) continue;
      if (item.type === "seed") {
        useCropStore.setState((s) => {
          const cur = s.inventory[item.cropId] ?? { seeds: 0, harvest: 0 };
          return {
            inventory: {
              ...s.inventory,
              [item.cropId]: { ...cur, seeds: cur.seeds + item.qty },
            },
          };
        });
      } else {
        for (let i = 0; i < item.qty; i++) {
          farm.registerAnimal(createAnimalAgent(item.kind, animalName(item.kind)));
        }
      }
    }
    const saved = normal - sale;
    return {
      ok: true,
      message: tr("shop.offer_bought", { name: tr(`offer.${comboId}.name`).toUpperCase() }),
      detail: tr("shop.offer_bought_detail", {
        pct: Math.round(discount * 100),
        money: `$${saved.toFixed(2)}`,
      }),
      fxLabel: tr(`offer.${comboId}.name`),
    };
  },
}));
