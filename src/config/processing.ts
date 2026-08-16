/**
 * Configuración de PROCESAMIENTO de productos. Centralizada: los precios se
 * resuelven siempre desde PRODUCT_ECONOMY (src/config/economy.ts), nunca desde
 * la interfaz. Muestra qué productos pueden procesarse y su valor de salida.
 *
 * - input/output: ids de PRODUCT_ECONOMY (unidad: 1 producto).
 * - processHours: tiempo del proceso en horas.
 * - cost:         coste fijo del proceso (se paga por cada lote).
 * - machine:      edificio/instalación donde se realiza.
 */
export interface ProcessDef {
  id: string;
  input: { productId: string; qty: number };
  output: { productId: string; qty: number };
  processHours: number;
  cost: number;
  machine: string;
}

export const PROCESS_ECONOMY: Record<string, ProcessDef> = {
  "egg-boiled": {
    id: "egg-boiled",
    input: { productId: "egg", qty: 1 },
    output: { productId: "boiled-egg", qty: 1 },
    processHours: 2,
    cost: 0.1,
    machine: "Procesadora",
  },
};

export const PROCESS_LIST: ProcessDef[] = Object.values(PROCESS_ECONOMY);
