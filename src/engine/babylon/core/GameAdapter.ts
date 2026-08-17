import { useWorldStore } from "../../../store/worldStore";
import { useFarmStore } from "../../../store/farmStore";
import { useCropStore, growthProgressOf } from "../../../store/cropStore";
import { useCameraStore } from "../../../store/cameraStore";
import { useInteriorStore, type InteriorPhase } from "../../../store/interiorStore";
import { useSelectionStore } from "../../../store/selectionStore";
import { useEconomyStore } from "../../../store/economyStore";
import { useUiStore, type GameSectionId } from "../../../store/uiStore";
import type { WeatherKind } from "../../../config/world";
import type { DayPhase, Season } from "../../../systems/time/TimeManager";
import type { AnimalAgent, SelectedEntity } from "../../../types";
import type { PlantedCrop } from "../../../store/cropStore";

export interface PlantedCropView {
  id: number;
  cropId: string;
  plotIndex: number;
  state: "growing" | "ready";
  quantity: number;
  growthProgress: number;
}

export interface GameState {
  weather: WeatherKind;
  hour: number;
  minute: number;
  dayPhase: DayPhase;
  season: Season;
  paused: boolean;
  fps: number;

  animals: AnimalAgent[];

  plantedCrops: PlantedCropView[];

  selectedEntity: SelectedEntity | null;
  hoveredEntity: SelectedEntity | null;

  interiorPhase: InteriorPhase;
  activeInteriorUid: string | null;
  hiddenBuildingUid: string | null;

  cameraTarget: [number, number, number];
  cameraYaw: number;
  cameraPitch: number;
  cameraDistance: number;

  gold: number;

  uiSection: GameSectionId | null;
  storeOpen: boolean;
}

let _cachedState: GameState;

function snapshot(): GameState {
  const world = useWorldStore.getState();
  const farm = useFarmStore.getState();
  const crop = useCropStore.getState();
  const cam = useCameraStore.getState();
  const interior = useInteriorStore.getState();
  const sel = useSelectionStore.getState();
  const econ = useEconomyStore.getState();
  const ui = useUiStore.getState();

  return {
    weather: world.weather,
    hour: world.hour,
    minute: world.minute,
    dayPhase: world.dayPhase,
    season: world.season,
    paused: world.paused,
    fps: world.fps,

    animals: farm.animals,

    plantedCrops: crop.planted.map((p: PlantedCrop) => ({
      id: p.id,
      cropId: p.cropId,
      plotIndex: p.plotIndex,
      state: p.state,
      quantity: p.quantity,
      growthProgress: growthProgressOf(p),
    })),

    selectedEntity: sel.selected,
    hoveredEntity: sel.hovered,

    interiorPhase: interior.phase,
    activeInteriorUid: interior.activeUid,
    hiddenBuildingUid: interior.hiddenUid,

    cameraTarget: cam.target,
    cameraYaw: cam.yaw,
    cameraPitch: cam.pitch,
    cameraDistance: cam.distance,

    gold: econ.gold,

    uiSection: ui.section,
    storeOpen: ui.storeOpen,
  };
}

let _unsubs: Array<() => void> = [];

export function initGameAdapter(): void {
  _cachedState = snapshot();

  const stores = [
    useWorldStore,
    useFarmStore,
    useCropStore,
    useCameraStore,
    useInteriorStore,
    useSelectionStore,
    useEconomyStore,
    useUiStore,
  ] as const;

  for (const store of stores) {
    _unsubs.push(
      store.subscribe(() => {
        _cachedState = snapshot();
      })
    );
  }
}

export function disposeGameAdapter(): void {
  for (const unsub of _unsubs) unsub();
  _unsubs.length = 0;
}

export function getGameState(): GameState {
  return _cachedState;
}
