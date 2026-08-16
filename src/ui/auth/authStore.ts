/**
 * Núcleo de autenticación (simulación con localStorage).
 * ---------------------------------------------
 * - Persistencia de usuarios registrados y de la sesión activa.
 * - Validaciones en tiempo real (email, nombre, teléfono, contraseña).
 * - Medidor de fortaleza de contraseña.
 * - Frases motivacionales rotatorias del panel.
 *
 * IMPORTANTE: es una demo de frontend. Las contraseñas se guardan en el
 * navegador solo para pruebas; en producción iría un backend real.
 */

export type FarmRole = "owner" | "worker" | "investor";

export interface FarmUser {
  name: string;
  email: string;
  phone: string;
  password: string;
  role: FarmRole;
  createdAt: string;
}

export interface FarmSession {
  name: string;
  email: string;
  role: FarmRole;
  remember: boolean;
  createdAt: string;
}

/** Claves de localStorage (con prefijo para evitar colisiones). */
const LS_USERS = "granja_users";
const LS_SESSION = "granja_session";
const LS_THEME = "granja_theme";
const LS_SOUND = "granja_sound";
const LS_PARTICLES = "granja_particles";

/* ------------------------------------------------------------------ */
/* Validadores                                                         */
/* ------------------------------------------------------------------ */

export const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

export function isValidEmail(value: string): boolean {
  return EMAIL_RE.test(value.trim());
}

export function isValidName(value: string): boolean {
  return value.trim().length >= 3;
}

export function isValidPassword(value: string): boolean {
  return value.length >= 8;
}

export type Strength = 0 | 1 | 2 | 3;

/**
 * Puntuación de fortaleza de contraseña (0..3).
 * 0-1 débil · 2 media · 3 fuerte
 */
export function passwordStrength(pw: string): Strength {
  let s = 0;
  if (pw.length >= 8) s++;
  if (/[A-Z]/.test(pw) && /[a-z]/.test(pw)) s++;
  if (/\d/.test(pw)) s++;
  if (/[^A-Za-z0-9]/.test(pw)) s++;
  return s as Strength;
}

export const STRENGTH_LABEL: Record<Strength, string> = {
  0: "Muy débil",
  1: "Débil",
  2: "Media",
  3: "Fuerte",
};

export const STRENGTH_COLOR: Record<Strength, string> = {
  0: "#c0392b",
  1: "#e67e22",
  2: "#d4a72c",
  3: "#2e7d4f",
};

/** Máscara de teléfono (###) ###-#### aplicada incrementalmente. */
export function maskPhone(raw: string): string {
  const digits = raw.replace(/\D/g, "").slice(0, 10);
  if (digits.length <= 3) return digits;
  if (digits.length <= 6) return `(${digits.slice(0, 3)}) ${digits.slice(3)}`;
  return `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6)}`;
}

/* ------------------------------------------------------------------ */
/* Persistencia de usuarios                                            */
/* ------------------------------------------------------------------ */

export function getUsers(): FarmUser[] {
  try {
    const raw = localStorage.getItem(LS_USERS);
    return raw ? (JSON.parse(raw) as FarmUser[]) : [];
  } catch {
    return [];
  }
}

function saveUsers(users: FarmUser[]): void {
  localStorage.setItem(LS_USERS, JSON.stringify(users));
}

export function findByEmail(email: string): FarmUser | undefined {
  const e = email.trim().toLowerCase();
  return getUsers().find((u) => u.email.toLowerCase() === e);
}

/** Registra un usuario nuevo (normaliza el email). Devuelve el usuario o null si ya existe. */
export function registerUser(input: Omit<FarmUser, "createdAt">): FarmUser | null {
  if (findByEmail(input.email)) return null;
  const user: FarmUser = { ...input, email: input.email.trim().toLowerCase(), createdAt: new Date().toISOString() };
  saveUsers([...getUsers(), user]);
  return user;
}

/* ------------------------------------------------------------------ */
/* Sesión                                                              */
/* ------------------------------------------------------------------ */

export function saveSession(user: Pick<FarmUser, "name" | "email" | "role">, remember: boolean): void {
  const session: FarmSession = { ...user, remember, createdAt: new Date().toISOString() };
  if (remember) localStorage.setItem(LS_SESSION, JSON.stringify(session));
  else sessionStorage.setItem(LS_SESSION, JSON.stringify(session));
}

export function readSession(): FarmSession | null {
  try {
    const raw = localStorage.getItem(LS_SESSION) || sessionStorage.getItem(LS_SESSION);
    return raw ? (JSON.parse(raw) as FarmSession) : null;
  } catch {
    return null;
  }
}

export function clearSession(): void {
  localStorage.removeItem(LS_SESSION);
  sessionStorage.removeItem(LS_SESSION);
}

/** Primer nombre para saludos ("Bienvenido de vuelta, Juan"). */
export function firstName(full: string): string {
  return full.trim().split(/\s+/)[0] ?? full;
}

/* ------------------------------------------------------------------ */
/* Preferencias (tema, sonido, partículas)                             */
/* ------------------------------------------------------------------ */

export function readPref(key: "theme" | "sound" | "particles", fallback: boolean): boolean {
  try {
    const map = { theme: LS_THEME, sound: LS_SOUND, particles: LS_PARTICLES } as const;
    const raw = localStorage.getItem(map[key]);
    return raw === null ? fallback : raw === "1";
  } catch {
    return fallback;
  }
}

export function writePref(key: "theme" | "sound" | "particles", value: boolean): void {
  const map = { theme: LS_THEME, sound: LS_SOUND, particles: LS_PARTICLES } as const;
  localStorage.setItem(map[key], value ? "1" : "0");
}

/* ------------------------------------------------------------------ */
/* Frases motivacionales (rotatorias)                                  */
/* ------------------------------------------------------------------ */

export const QUOTES = [
  "«La tierra da frutos a quien la trabaja con pasión.»",
  "«Cada cosecha comienza con una semilla y una promesa.»",
  "«El mejor abono para la tierra es el esfuerzo del agricultor.»",
  "«Quien siembra hoy, cosecha mañana al amanecer.»",
  "«La lluvia prepara la tierra; la paciencia, la cosecha.»",
];
