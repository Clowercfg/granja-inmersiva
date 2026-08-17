import { create } from "zustand";
import { useEconomyStore } from "./economyStore";

const STORAGE_KEY = "granja-inmersiva-diamonds-v1";
const API_BASE = "/api/payments";

export type PaymentStatus = "created" | "waiting" | "confirming" | "confirmed" | "finished" | "failed" | "expired" | "cancelled" | "error";

export interface PaymentOrder {
  paymentId: string;
  invoiceId?: string;
  paymentUrl?: string;
  providerPaymentId?: string;
  status: PaymentStatus;
  priceUsd: number;
  diamonds: number;
  payCurrency?: string;
  createdAt: string;
  sandbox: boolean;
}

interface DiamondStore {
  purchaseModalOpen: boolean;
  activePayment: PaymentOrder | null;
  history: Array<{
    paymentId: string;
    packageName: string;
    diamonds: number;
    priceUsd: number;
    status: string;
    createdAt: string;
  }>;
  _pollTimer: ReturnType<typeof setInterval> | null;

  openPurchaseModal: () => void;
  closePurchaseModal: () => void;
  createPayment: (packageId: string, payCurrency: string) => Promise<PaymentOrder | null>;
  pollPaymentStatus: (paymentId: string) => Promise<void>;
  cancelPayment: () => void;
  dismissPayment: () => void;
  loadHistory: (userId?: string) => Promise<void>;
}

export const useDiamondStore = create<DiamondStore>((set, get) => ({
  purchaseModalOpen: false,
  activePayment: null,
  history: [],
  _pollTimer: null,

  openPurchaseModal: () => set({ purchaseModalOpen: true }),

  closePurchaseModal: () => {
    const timer = get()._pollTimer;
    if (timer) clearInterval(timer);
    set({ purchaseModalOpen: false, activePayment: null, _pollTimer: null });
  },

  dismissPayment: () => {
    const timer = get()._pollTimer;
    if (timer) clearInterval(timer);
    set({ activePayment: null, _pollTimer: null });
  },

  cancelPayment: () => {
    const timer = get()._pollTimer;
    if (timer) clearInterval(timer);
    set({ activePayment: null, _pollTimer: null });
  },

  createPayment: async (packageId, payCurrency) => {
    try {
      const res = await fetch(`${API_BASE}/crypto/create`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: "guest", packageId, payCurrency }),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        console.error("[Payment] create error:", err);
        return null;
      }

      const order: PaymentOrder = await res.json();
      set({ activePayment: order });

      // Start polling
      get().pollPaymentStatus(order.paymentId);
      const timer = setInterval(() => get().pollPaymentStatus(order.paymentId), 5000);
      set({ _pollTimer: timer });

      return order;
    } catch (err) {
      console.error("[Payment] create fetch error:", err);
      return null;
    }
  },

  pollPaymentStatus: async (paymentId) => {
    try {
      const res = await fetch(`${API_BASE}/crypto/${paymentId}`);
      if (!res.ok) return;

      const data: PaymentOrder = await res.json();
      const current = get().activePayment;

      if (current && current.paymentId === paymentId) {
        set({ activePayment: { ...current, status: data.status } });

        if (["finished", "failed", "expired", "cancelled"].includes(data.status)) {
          const timer = get()._pollTimer;
          if (timer) clearInterval(timer);
          set({ _pollTimer: null });

          if (data.status === "finished") {
            useEconomyStore.getState().addDiamonds(data.diamonds);
          }
        }
      }
    } catch {
      // Ignore poll errors
    }
  },

  loadHistory: async (userId = "guest") => {
    try {
      const res = await fetch(`${API_BASE}/history?userId=${userId}`);
      if (!res.ok) return;
      const data = await res.json();
      set({ history: data.history || [] });
    } catch {
      // Ignore
    }
  },
}));
