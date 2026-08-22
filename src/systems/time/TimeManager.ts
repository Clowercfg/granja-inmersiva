export type TimeMode = "real" | "paused" | "sim";

export {
  type DayPhase,
  type Season,
  DAY_PHASE_LABEL,
  SEASON_LABEL,
  WEEKDAY_LABEL,
  MONTH_LABEL,
  dayPhaseOf,
  seasonOf,
  hourOfDay,
  isNightTime,
  computeSun,
  computeAtmosphere,
  type SunInfo,
  type Weather,
  type AtmosphereColors,
} from "./timeLogic";

type TimeEvent = "second" | "minute" | "hour" | "day";

interface ClockSnapshot {
  second: number;
  minute: number;
  hour: number;
  day: string;
}

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
