/**
 * Configuración de economía de cultivos. Centralizada para poder balancear
 * precios sin tocar la lógica del juego.
 *
 * Valores por cultivo:
 * - seedPrice:    coste de la semilla (se descuenta del saldo al sembrar).
 * - growthHours:  horas hasta que el cultivo queda listo para cosechar.
 * - sellPrice:    precio de venta por unidad cosechada.
 * - profitPerUnit: ganancia bruta por unidad (sellPrice - seedPrice).
 */
export interface CropEconomyDef {
  name: string;
  seedPrice: number;
  growthHours: number;
  sellPrice: number;
  profitPerUnit: number;
}

export const CROP_ECONOMY: Record<string, CropEconomyDef> = {
  wheat: {
    name: "Trigo",
    seedPrice: 0.2,
    growthHours: 24,
    sellPrice: 0.204,
    profitPerUnit: 0.004,
  },
  carrot: {
    name: "Zanahoria",
    seedPrice: 0.2,
    growthHours: 48,
    sellPrice: 0.2049,
    profitPerUnit: 0.0049,
  },
  potato: {
    name: "Papa",
    seedPrice: 0.4,
    growthHours: 48,
    sellPrice: 0.41,
    profitPerUnit: 0.01,
  },
};

export function getCropEconomy(cropId: string): CropEconomyDef | null {
  return CROP_ECONOMY[cropId] ?? null;
}

/**
 * Economía veterinaria. Todo configurable aquí:
 * - price:          precio de compra del animal (referencia, aún sin tienda).
 * - treatmentCost:  coste del tratamiento que paga el jugador al tratarlo.
 * - recoveryHours:  tiempo de recuperación tras el tratamiento (producción al 50%).
 *
 * Incluye especies futuras (Gallo/Cerdo): el sistema funciona para cualquier
 * especie que exista en el corral sin tocar esta lógica.
 */
export interface AnimalEconomyDef {
  name: string;
  icon: string;
  price: number;
  treatmentCost: number;
  recoveryHours: number;
}

export const ANIMAL_ECONOMY: Record<string, AnimalEconomyDef> = {
  chicken: { name: "Gallina", icon: "🐔", price: 10, treatmentCost: 0.4, recoveryHours: 6 },
  rooster: { name: "Gallo", icon: "🐓", price: 35, treatmentCost: 1.25, recoveryHours: 6 },
  cow: { name: "Vaca", icon: "🐄", price: 50, treatmentCost: 2.5, recoveryHours: 12 },
  pig: { name: "Cerdo", icon: "🐖", price: 30, treatmentCost: 1.5, recoveryHours: 24 },
};

export function getAnimalEconomy(kind: string): AnimalEconomyDef | null {
  return ANIMAL_ECONOMY[kind] ?? null;
}

/**
 * Frecuencia de enfermedad. Granja de referencia = 20 animales.
 * - sickPerFarmDay:       ~1 animal enfermo cada 9 días (1/9 ≈ 0.1111 por día).
 * - referenceFarmSize:    animales de la granja de referencia (se reparte la tasa).
 * - minSickIntervalDays:  intervalo mínimo entre enfermedades del mismo animal (≥ 14 días).
 * - checkIntervalSeconds: cada cuánto se evalúa la probabilidad en tiempo real.
 */
export const SICKNESS_ECONOMY = {
  sickPerFarmDay: 1 / 9,
  referenceFarmSize: 20,
  minSickIntervalDays: 14,
  checkIntervalSeconds: 10,
};
