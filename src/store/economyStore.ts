import { create } from "zustand";

interface EconomyStore {
  gold: number;
  lastIncomeAt: number;
  totalIncome: number;
  totalExpenses: number;
  addGold: (amount: number, note?: string) => void;
  spendGold: (amount: number) => boolean;
  setGold: (g: number) => void;
}

export const useEconomyStore = create<EconomyStore>((set, get) => ({
  gold: 2500,
  lastIncomeAt: Date.now(),
  totalIncome: 0,
  totalExpenses: 0,
  addGold: (amount) =>
    set((s) => ({ gold: s.gold + amount, totalIncome: s.totalIncome + Math.max(0, amount) })),
  spendGold: (amount) => {
    if (get().gold < amount) return false;
    set((s) => ({ gold: s.gold - amount, totalExpenses: s.totalExpenses + amount }));
    return true;
  },
  setGold: (g) => set({ gold: g }),
}));
