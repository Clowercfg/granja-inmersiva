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
  carrot: {
    name: "Zanahoria",
    seedPrice: 0.2,
    growthHours: 48,
    sellPrice: 0.2049,
    profitPerUnit: 0.0049,
  },
};

export function getCropEconomy(cropId: string): CropEconomyDef | null {
  return CROP_ECONOMY[cropId] ?? null;
}
