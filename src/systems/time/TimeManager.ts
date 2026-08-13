export type TimeMode = "real" | "paused" | "sim";
export type DayPhase = "dawn" | "morning" | "midday" | "afternoon" | "dusk" | "night";
export type Season = "spring" | "summer" | "autumn" | "winter";

export const DAY_PHASE_LABEL: Record<DayPhase, string> = {
  dawn: "Amanecer",
  morning: "Mañana",
  midday: "Mediodía",
  afternoon: "Tarde",
  dusk: "Atardecer",
  night: "Noche",
};

export const SEASON_LABEL: Record<Season, string> = {
  spring: "Primavera",
  summer: "Verano",
  autumn: "Otoño",
  winter: "Invierno",
};

export const WEEKDAY_LABEL = [
  "Domingo",
  "Lunes",
  "Martes",
  "Miércoles",
  "Jueves",
  "Viernes",
  "Sábado",
] as const;

export const MONTH_LABEL = [
  "enero",
  "febrero",
  "marzo",
  "abril",
  "mayo",
  "junio",
  "julio",
  "agosto",
  "septiembre",
  "octubre",
  "noviembre",
  "diciembre",
] as const;

export function dayPhaseOf(d: Date): DayPhase {
  const h = d.getHours();
  if (h >= 5 && h < 8) return "dawn";
  if (h >= 8 && h < 11) return "morning";
  if (h >= 11 && h < 15) return "midday";
  if (h >= 15 && h < 18) return "afternoon";
  if (h >= 18 && h < 21) return "dusk";
  return "night";
}

export function seasonOf(d: Date): Season {
  const m = d.getMonth();
  if (m >= 2 && m <= 4) return "spring";
  if (m >= 5 && m <= 7) return "summer";
  if (m >= 8 && m <= 10) return "autumn";
  return "winter";
}

type TimeEvent = "second" | "minute" | "hour" | "day";

interface ClockSnapshot {
  second: number;
  minute: number;
  hour: number;
  day: string;
}

/**
 * Controla el tiempo del juego. La regla principal: el reloj del juego se
 * sincroniza con la hora real del sistema. También guarda la arquitectura
 * para futuros modos PAUSED y SIMULATION SPEED.
 */
class TimeManager {
  private mode: TimeMode = "real";
  private speed = 1;
  private simOffsetMs = 0;
  private frozenAt: number | null = null;
  private lastKey: ClockSnapshot = { second: -1, minute: -1, hour: -1, day: "" };
  private listeners = new Map<TimeEvent, Set<() => void>>();

  getMode(): TimeMode {
    return this.mode;
  }

  getSpeed(): number {
    return this.speed;
  }

  /** Obtiene la fecha/hora actual del juego. En modo real = fecha del sistema. */
  getNow(): Date {
    if (this.mode === "paused" && this.frozenAt !== null) return new Date(this.frozenAt);
    if (this.mode === "sim") return new Date(Date.now() + this.simOffsetMs);
    return new Date();
  }

  setMode(mode: TimeMode): void {
    if (mode === "paused") this.frozenAt = this.getNow().getTime();
    else this.frozenAt = null;
    this.mode = mode;
  }

  setPaused(paused: boolean): void {
    if (paused) {
      this.frozenAt = this.getNow().getTime();
      this.mode = "paused";
    } else if (this.mode === "paused") {
      this.mode = "real";
    }
  }

  setSpeed(speed: number): void {
    this.speed = Math.max(0.25, speed);
  }

  /** Avanza el offset simulado y dispara los eventos de tiempo. Llamado desde el frame loop. */
  tick(dtSec: number): void {
    if (this.mode === "sim") this.simOffsetMs += (this.speed - 1) * dtSec * 1000;

    const d = this.getNow();
    const ms = d.getTime();
    const sec = Math.floor(ms / 1000);

    if (sec !== this.lastKey.second) {
      this.lastKey.second = sec;
      this.emit("second");
    }
    if (d.getMinutes() !== this.lastKey.minute) {
      this.lastKey.minute = d.getMinutes();
      this.emit("minute");
    }
    if (d.getHours() !== this.lastKey.hour) {
      this.lastKey.hour = d.getHours();
      this.emit("hour");
    }
    const dayKey = `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
    if (dayKey !== this.lastKey.day) {
      this.lastKey.day = dayKey;
      this.emit("day");
    }
  }

  on(event: TimeEvent, cb: () => void): () => void {
    if (!this.listeners.has(event)) this.listeners.set(event, new Set());
    this.listeners.get(event)!.add(cb);
    return () => this.listeners.get(event)?.delete(cb);
  }

  private emit(event: TimeEvent): void {
    this.listeners.get(event)?.forEach((cb) => cb());
  }
}

export const timeManager = new TimeManager();
