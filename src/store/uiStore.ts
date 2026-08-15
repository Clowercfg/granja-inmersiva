import { create } from "zustand";

export type GameSectionId =
  | "animals"
  | "veterinary"
  | "crops"
  | "infrastructure"
  | "inventory"
  | "calendar";

interface UiStore {
  section: GameSectionId | null;
  openSection: (id: GameSectionId) => void;
  toggleSection: (id: GameSectionId) => void;
  closeSection: () => void;
}

export const useUiStore = create<UiStore>((set, get) => ({
  section: null,
  openSection: (id) => set({ section: id }),
  toggleSection: (id) => set({ section: get().section === id ? null : id }),
  closeSection: () => set({ section: null }),
}));
