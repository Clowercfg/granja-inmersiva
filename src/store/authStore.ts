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

interface AuthState {
  token: string | null;
  user: TelegramUser | null;
  status: "idle" | "loading" | "authenticated" | "error" | "not_in_telegram";
  error: string | null;

  /** Initialize auth: detect Telegram, send initData to backend */
  init: () => Promise<void>;

  /** Dev mode: use /api/auth/dev-login */
  devLogin: () => Promise<void>;

  /** Logout */
  logout: () => Promise<void>;

  /** Get stored token */
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

/** Detect if running inside Telegram Mini App */
function isTelegramWebApp(): boolean {
  return typeof window !== "undefined" && !!(window as any).Telegram?.WebApp?.initData;
}

/** Get Telegram WebApp instance */
function getTelegramWebApp(): any {
  return (window as any).Telegram?.WebApp;
}

async function apiPost<T = any>(path: string, body: Record<string, unknown>, token?: string | null): Promise<T> {
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (token) headers["Authorization"] = `Bearer ${token}`;
  const res = await fetch(`${API}${path}`, { method: "POST", headers, body: JSON.stringify(body) });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: "network_error" }));
    throw new Error(err.error || err.message || `HTTP ${res.status}`);
  }
  return res.json();
}

async function apiGet<T = any>(path: string, token?: string | null): Promise<T> {
  const headers: Record<string, string> = {};
  if (token) headers["Authorization"] = `Bearer ${token}`;
  const res = await fetch(`${API}${path}`, { headers });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: "network_error" }));
    throw new Error(err.error || err.message || `HTTP ${res.status}`);
  }
  return res.json();
}

export const useAuthStore = create<AuthState>((set, get) => ({
  token: getStoredToken(),
  user: null,
  status: "idle",
  error: null,

  init: async () => {
    const stored = getStoredToken();
    if (stored) {
      // Try to validate existing session
      set({ status: "loading" });
      try {
        const data = await apiGet("/me", stored);
        if (data.user) {
          set({ token: stored, user: data.user, status: "authenticated", error: null });
          // Initialize Telegram WebApp if available
          initTelegramWebApp();
          return;
        }
      } catch {
        // Invalid/expired session — clear and try fresh login
        clearToken();
      }
    }

    // No valid session — check if in Telegram
    const tgApp = getTelegramWebApp();
    if (tgApp?.initData) {
      // In Telegram — authenticate
      set({ status: "loading" });
      try {
        const data = await apiPost("/auth/telegram", { initData: tgApp.initData });
        storeToken(data.token);
        initTelegramWebApp();
        set({ token: data.token, user: data.user, status: "authenticated", error: null });
      } catch (err) {
        set({ status: "error", error: (err as Error).message });
      }
    } else if (!process.env.NODE_ENV || process.env.NODE_ENV === "development") {
      // Dev mode: outside Telegram — try dev-login
      set({ status: "loading" });
      try {
        const data = await apiGet("/auth/dev-login");
        storeToken(data.token);
        set({ token: data.token, user: data.user, status: "authenticated", error: null });
      } catch {
        set({ status: "not_in_telegram", error: null });
      }
    } else {
      // Production: not in Telegram
      set({ status: "not_in_telegram", error: null });
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
    set({ token: null, user: null, status: "idle", error: null });
  },

  getToken: () => get().token,
}));

/** Signal to Telegram that the Mini App is ready */
function initTelegramWebApp() {
  try {
    const tgApp = getTelegramWebApp();
    if (tgApp?.ready) tgApp.ready();
  } catch { /* ignore */ }
}

/**
 * Get auth headers for API calls (bearer token).
 * Used by other stores to send authenticated requests.
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
