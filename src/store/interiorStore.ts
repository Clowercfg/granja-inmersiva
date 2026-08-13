import { create } from "zustand";
import type { BuildingType } from "../config/world";

export type InteriorPhase =
  | "idle"
  | "entering"
  | "fadeIn"
  | "inside"
  | "fadeOut"
  | "outside";

export interface SavedCameraState {
  target: [number, number, number];
  yaw: number;
  pitch: number;
  distance: number;
}

interface InteriorStore {
  activeUid: string | null;
  type: BuildingType | null;
  phase: InteriorPhase;
  hiddenUid: string | null;
  savedCamera: SavedCameraState | null;
  requestEnter: (uid: string, type: BuildingType) => void;
  captureCamera: (s: SavedCameraState) => void;
  finishApproach: () => void;
  enterInside: () => void;
  requestExit: () => void;
  finishExit: () => void;
  reset: () => void;
}

export const useInteriorStore = create<InteriorStore>((set) => ({
  activeUid: null,
  type: null,
  phase: "idle",
  hiddenUid: null,
  savedCamera: null,
  requestEnter: (uid, type) =>
    set({ activeUid: uid, type, phase: "entering", hiddenUid: null, savedCamera: null }),
  captureCamera: (s) => set((st) => ({ savedCamera: st.savedCamera ?? s })),
  finishApproach: () => set({ phase: "fadeIn" }),
  enterInside: () => set((s) => ({ phase: "inside", hiddenUid: s.activeUid })),
  requestExit: () => set({ phase: "fadeOut" }),
  finishExit: () => set({ phase: "outside", hiddenUid: null }),
  reset: () =>
    set({ activeUid: null, type: null, phase: "idle", hiddenUid: null, savedCamera: null }),
}));
