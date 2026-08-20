import { create } from "zustand";
import { authFetch } from "./authStore";

const API = "/api";

interface AffiliatePlayer {
  name: string;
  code: string;
  status: string;
  referredBy: string | null;
  createdAt: string;
}

interface LevelStat {
  affiliate_level: number;
  user_count: number;
  total_profit: number;
  total_commission: number;
}

interface CommissionRecord {
  id: string;
  beneficiary_user_id: string;
  source_user_id: string;
  source_profit_tx_id: string;
  affiliate_level: number;
  commission_rate: number;
  eligible_profit: number;
  commission_amount: number;
  currency: string;
  status: string;
  description: string;
  created_at: string;
  settled_at: string | null;
}

interface ReferralInfo {
  player_name: string;
  affiliate_code: string;
  status: string;
  created_at: string;
  children?: ReferralInfo[];
}

export interface AffiliateDashboard {
  player: AffiliatePlayer;
  directReferrals: number;
  networkCount: number;
  pendingCommissions: number;
  availableCommissions: number;
  totalEarned: number;
  levelStats: LevelStat[];
  recentCommissions: CommissionRecord[];
  referrals: ReferralInfo[];
}

interface AffiliateStore {
  dashboard: AffiliateDashboard | null;
  referralLink: string;
  tree: ReferralInfo[];
  loading: boolean;
  error: string | null;

  loadDashboard: () => Promise<void>;
  loadCode: () => Promise<void>;
  registerReferral: (code: string) => Promise<{ ok: boolean; error?: string }>;
  loadTree: (depth?: number) => Promise<void>;
  loadLink: () => Promise<void>;
  reportProfit: (transactionId: string, eligibleProfit: number, description?: string) => Promise<boolean>;
}

export const useAffiliateStore = create<AffiliateStore>((set) => ({
  dashboard: null,
  referralLink: "",
  tree: [],
  loading: false,
  error: null,

  loadDashboard: async () => {
    set({ loading: true, error: null });
    try {
      const res = await authFetch("/affiliate/dashboard/me");
      if (!res.ok) throw new Error("Failed to load dashboard");
      const data = await res.json();
      set({ dashboard: data, loading: false });
    } catch (err) {
      set({ error: (err as Error).message, loading: false });
    }
  },

  loadCode: async () => {
    try {
      const res = await authFetch("/affiliate/code/me");
      if (!res.ok) return;
      const data = await res.json();
      set((s) => ({
        dashboard: s.dashboard
          ? { ...s.dashboard, player: { ...s.dashboard.player, code: data.affiliateCode } }
          : null,
        referralLink: `${window.location.origin}/?ref=${data.affiliateCode}`,
      }));
    } catch { /* ignore */ }
  },

  registerReferral: async (code) => {
    set({ loading: true, error: null });
    try {
      const res = await authFetch("/affiliate/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ referralCode: code }),
      });
      const data = await res.json();
      set({ loading: false });
      if (data.ok) return { ok: true };
      return { ok: false, error: data.error };
    } catch (err) {
      set({ error: (err as Error).message, loading: false });
      return { ok: false, error: "network_error" };
    }
  },

  loadTree: async (depth = 2) => {
    try {
      const res = await authFetch(`/affiliate/tree/me?depth=${depth}`);
      if (!res.ok) return;
      const data = await res.json();
      set({ tree: data.tree || [] });
    } catch { /* ignore */ }
  },

  loadLink: async () => {
    try {
      const res = await authFetch("/affiliate/link/me");
      if (!res.ok) return;
      const data = await res.json();
      set({ referralLink: data.link });
    } catch { /* ignore */ }
  },

  reportProfit: async (transactionId, eligibleProfit, description = "") => {
    try {
      const res = await authFetch("/affiliate/report-profit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ transactionId, eligibleProfit, description }),
      });
      const data = await res.json();
      return data.ok === true;
    } catch {
      return false;
    }
  },
}));
