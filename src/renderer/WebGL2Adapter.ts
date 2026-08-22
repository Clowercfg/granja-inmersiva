import type {
  RendererAdapter,
  CropState,
  AnimalState,
  BuildingState,
} from "./RendererAdapter";

export class WebGL2Adapter implements RendererAdapter {
  private container: HTMLElement | null = null;

  initialize(container: HTMLElement): void {
    this.container = container;
  }

  destroy(): void {
    this.container = null;
  }

  update(_dt: number): void {}

  addCrop(_crop: CropState): void {}
  updateCrop(_crop: CropState): void {}
  removeCrop(_id: number): void {}

  addAnimal(_animal: AnimalState): void {}
  updateAnimal(_animal: AnimalState): void {}
  removeAnimal(_id: number): void {}

  addBuilding(_building: BuildingState): void {}
  updateBuilding(_building: BuildingState): void {}
  removeBuilding(_id: string): void {}
}
