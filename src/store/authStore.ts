import { create } from "zustand";

const API = "/api";
const SESSION_KEY = "granja_session_token";

export interface TelegramUser {
  id: string;
  firstName: string;
  lastName: string;
  username: string;
  photoUrl: string;
  languageCode: string;
  role: string;
}

export type AuthStatus =
  | "initializing"
  | "loading"
  | "authenticated"
  | "error"
  | "not_in_telegram";

interface AuthState {
  token: string | null;
  user: TelegramUser | null;
  status: AuthStatus;
  error: string | null;

  init: () => Promise<void>;
  devLogin: () => Promise<void>;
  logout: () => Promise<void>;
  getToken: () => string | null;
}

function getStoredToken(): string | null {
  try {
    return localStorage.getItem(SESSION_KEY);
  } catch {
    return null;
  }
}

function storeToken(token: string) {
  try { localStorage.setItem(SESSION_KEY, token); } catch {}
}

function clearToken() {
  try { localStorage.removeItem(SESSION_KEY); } catch {}
}

/* ─── Telegram WebApp helpers ─── */

declare global {
  interface Window {
    Telegram?: { WebApp?: TelegramWebApp };
  }
}

interface TelegramWebApp {
  initData: string;
  initDataUnsafe?: Record<string, any>;
  ready: () => void;
  expand: () => void;
  close: () => void;
  colorScheme?: string;
  themeParams?: Record<string, string>;
  platform?: string;
  version?: string;
}

function getTelegramWebApp(): TelegramWebApp | undefined {
  return (window as any).Telegram?.WebApp;
}

/**
 * Primary Telegram detection — checks the official WebApp API.
 * NOT user-agent based. Checks window.Telegram.WebApp.initData.
 */
function hasTelegramInitData(): boolean {
  const tg = getTelegramWebApp();
  return !!(tg && typeof tg.initData === "string" && tg.initData.length > 0);
}

/**
 * Secondary detection — URL contains tgWebAppData param.
 * This is present when Telegram opens a Mini App URL.
 * Useful as fallback if the SDK hasn't fully initialized yet.
 */
function hasTelegramUrlParam(): boolean {
  try {
    const url = new URL(window.location.href);
    return url.searchParams.has("tgWebAppData") || url.hash.includes("tgWebAppData");
  } catch {
    return false;
  }
}

/**
 * Combined Telegram context detection.
 * Primary: official WebApp API with initData.
 * Secondary: URL parameter presence (for early detection before SDK init).
 */
function detectTelegramContext(): "webapp" | "url_param" | "none" {
  if (hasTelegramInitData()) return "webapp";
  if (hasTelegramUrlParam()) return "url_param";
  return "none";
}

/* ─── API helpers ─── */

async function apiPost<T = any>(path: string, body: Record<string, unknown>, token?: string | null): Promise<T> {
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (token) headers["Authorization"] = `Bearer ${token}`;
  const res = await fetch(`${API}${path}`, { method: "POST", headers, body: JSON.stringify(body) });
  if (!res.ok) {
    const ct = res.headers.get("content-type") || "";
    if (ct.includes("application/json")) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || err.message || `HTTP ${res.status}`);
    }
    throw new Error(`server_error_${res.status}`);
  }
  return res.json();
}

async function apiGet<T = any>(path: string, token?: string | null): Promise<T> {
  const headers: Record<string, string> = {};
  if (token) headers["Authorization"] = `Bearer ${token}`;
  const res = await fetch(`${API}${path}`, { headers });
  if (!res.ok) {
    const ct = res.headers.get("content-type") || "";
    if (ct.includes("application/json")) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || err.message || `HTTP ${res.status}`);
    }
    throw new Error(`server_error_${res.status}`);
  }
  return res.json();
}

/* ─── Telegram WebApp init ─── */

function initTelegramWebAppUI() {
  try {
    const tg = getTelegramWebApp();
    if (tg) {
      if (tg.ready) tg.ready();
      if (tg.expand) tg.expand();
    }
  } catch { /* ignore */ }
}

/* ─── Auth bootstrap ─── */

/**
 * Wait briefly for Telegram WebApp SDK to populate initData.
 * When opened from Telegram, the SDK script loads and injects the
 * object, but there's a small window where React may mount first.
 *
 * We poll with short intervals up to a max wait, then decide.
 */
async function waitForTelegramSdk(maxWaitMs = 2000): Promise<"webapp" | "none"> {
  const interval = 100;
  let elapsed = 0;

  while (elapsed < maxWaitMs) {
    if (hasTelegramInitData()) return "webapp";
    await new Promise((r) => setTimeout(r, interval));
    elapsed += interval;
  }

  return hasTelegramInitData() ? "webapp" : "none";
}

export const useAuthStore = create<AuthState>((set, get) => ({
  token: getStoredToken(),
  user: null,
  status: "initializing",
  error: null,

  init: async () => {
    // Prevent double-init: only run if currently initializing
    if (get().status !== "initializing") return;

    // ── Step 1: Check existing session ──
    const stored = getStoredToken();
    if (stored) {
      set({ status: "loading" });
      try {
        const data = await apiGet("/me", stored);
        if (data.user) {
          initTelegramWebAppUI();
          set({ token: stored, user: data.user, status: "authenticated", error: null });
          return;
        }
      } catch {
        clearToken();
      }
    }

    // ── Step 2: Detect Telegram context ──
    // First check immediately (SDK may already be loaded)
    const quickDetection = detectTelegramContext();

    if (quickDetection === "webapp") {
      // Perfect — SDK is ready with initData
      await authenticateWithTelegram();
      return;
    }

    if (quickDetection === "url_param") {
      // We're in Telegram but SDK hasn't fully loaded yet — wait briefly
      set({ status: "loading" });
      const result = await waitForTelegramSdk(1500);
      if (result === "webapp") {
        await authenticateWithTelegram();
        return;
      }
    }

    // ── Step 3: Dev mode fallback ──
    if (!process.env.NODE_ENV || process.env.NODE_ENV === "development") {
      set({ status: "loading" });
      try {
        const data = await apiGet("/auth/dev-login");
        storeToken(data.token);
        set({ token: data.token, user: data.user, status: "authenticated", error: null });
        return;
      } catch {
        // dev-login unavailable — fall through
      }
    }

    // ── Step 4: Not in Telegram ──
    set({ status: "not_in_telegram", error: null });

    async function authenticateWithTelegram() {
      const tgApp = getTelegramWebApp();
      if (!tgApp?.initData) {
        set({ status: "error", error: "Telegram WebApp initData not available" });
        return;
      }

      set({ status: "loading" });
      try {
        const data = await apiPost("/auth/telegram", { initData: tgApp.initData });
        storeToken(data.token);
        initTelegramWebAppUI();
        set({ token: data.token, user: data.user, status: "authenticated", error: null });
      } catch (err) {
        set({ status: "error", error: (err as Error).message });
      }
    }
  },

  devLogin: async () => {
    set({ status: "loading" });
    try {
      const data = await apiGet("/auth/dev-login");
      storeToken(data.token);
      set({ token: data.token, user: data.user, status: "authenticated", error: null });
    } catch (err) {
      set({ status: "error", error: (err as Error).message });
    }
  },

  logout: async () => {
    const token = get().token;
    try { await apiPost("/auth/logout", {}, token); } catch { /* ignore */ }
    clearToken();
    set({ token: null, user: null, status: "not_in_telegram", error: null });
  },

  getToken: () => get().token,
}));

/**
 * Get auth headers for API calls (bearer token).
 */
export function getAuthHeaders(): Record<string, string> {
  const token = useAuthStore.getState().token;
  if (!token) return {};
  return { Authorization: `Bearer ${token}` };
}

/**
 * Authenticated fetch wrapper.
 */
export async function authFetch(path: string, init?: RequestInit): Promise<Response> {
  const token = useAuthStore.getState().token;
  const headers = new Headers(init?.headers);
  if (token) headers.set("Authorization", `Bearer ${token}`);
  return fetch(`${API}${path}`, { ...init, headers });
}
