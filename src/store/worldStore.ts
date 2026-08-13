import { create } from "zustand";
import type { WeatherKind } from "../config/world";
import {
  MONTH_LABEL,
  WEEKDAY_LABEL,
  dayPhaseOf,
  seasonOf,
  type DayPhase,
  type Season,
} from "../systems/time/TimeManager";

interface WorldStore {
  booted: boolean;
  rendererMode: "webgpu" | "webgl";
  fps: number;
  weather: WeatherKind;
  paused: boolean;

  // Reloj en tiempo real (actualizado 1 vez por segundo desde TimeSystem)
  now: number;
  hour: number;
  minute: number;
  second: number;
  dayOfMonth: number;
  month: number;
  year: number;
  dayOfWeek: string;
  monthName: string;
  dayPhase: DayPhase;
  season: Season;

  setWeather: (w: WeatherKind) => void;
  togglePause: () => void;
  setPaused: (p: boolean) => void;
  setRendererMode: (m: "webgpu" | "webgl") => void;
  setBooted: (b: boolean) => void;
  setFps: (f: number) => void;
  syncClock: (d: Date) => void;
}

export const useWorldStore = create<WorldStore>((set) => ({
  booted: false,
  rendererMode: "webgl",
  fps: 60,
  weather: "clear",
  paused: false,

  now: Date.now(),
  hour: 0,
  minute: 0,
  second: 0,
  dayOfMonth: 1,
  month: 1,
  year: 2026,
  dayOfWeek: "",
  monthName: "",
  dayPhase: "dawn",
  season: "summer",

  setWeather: (w) => set({ weather: w }),
  togglePause: () => set((s) => ({ paused: !s.paused })),
  setPaused: (p) => set({ paused: p }),
  setRendererMode: (m) => set({ rendererMode: m }),
  setBooted: (b) => set({ booted: b }),
  setFps: (f) => set({ fps: f }),
  syncClock: (d) =>
    set({
      now: d.getTime(),
      hour: d.getHours(),
      minute: d.getMinutes(),
      second: d.getSeconds(),
      dayOfMonth: d.getDate(),
      month: d.getMonth() + 1,
      year: d.getFullYear(),
      dayOfWeek: WEEKDAY_LABEL[d.getDay()],
      monthName: MONTH_LABEL[d.getMonth()],
      dayPhase: dayPhaseOf(d),
      season: seasonOf(d),
    }),
}));
