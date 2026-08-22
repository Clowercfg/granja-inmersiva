export interface CropState {
  id: number;
  plotIndex: number;
  type: string;
  plantedAt: number;
  watered: boolean;
}

export interface AnimalState {
  id: number;
  kind: string;
  position: [number, number, number];
  rotation: number;
  state: string;
  scale: number;
}

export interface BuildingState {
  id: string;
  type: string;
  position: [number, number, number];
  rotation: number;
}

export interface RendererAdapter {
  initialize(container: HTMLElement): void;
  destroy(): void;
  update(dt: number): void;

  addCrop(crop: CropState): void;
  updateCrop(crop: CropState): void;
  removeCrop(id: number): void;

  addAnimal(animal: AnimalState): void;
  updateAnimal(animal: AnimalState): void;
  removeAnimal(id: number): void;

  addBuilding(building: BuildingState): void;
  updateBuilding(building: BuildingState): void;
  removeBuilding(id: string): void;
}
