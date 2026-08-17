/** Interfaces de estado para comunicación futura GAME LOGIC → BABYLON RENDERER. */

export interface AnimalRenderState {
  id: string;
  type: string;
  position: { x: number; y: number; z: number };
  rotation: number;
  animation: string;
}

export interface CropRenderState {
  id: string;
  type: string;
  plotIndex: number;
  quantity: number;
  growthProgress: number;
  state: "growing" | "ready";
}

export interface BuildingRenderState {
  id: string;
  type: string;
  position: { x: number; y: number; z: number };
  rotation: number;
}

export interface GameState {
  animals: AnimalRenderState[];
  crops: CropRenderState[];
  buildings: BuildingRenderState[];
  hour: number;
  minute: number;
  season: string;
  weather: string;
}
