export type DayPhase = "dawn" | "morning" | "midday" | "afternoon" | "dusk" | "night";

export const DAY_PHASE_LABEL: Record<DayPhase, string> = {
  dawn: "Amanecer",
  morning: "Mañana",
  midday: "Mediodía",
  afternoon: "Tarde",
  dusk: "Atardecer",
  night: "Noche",
};

export type Season = "spring" | "summer" | "autumn" | "winter";

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

export function hourOfDay(d: Date): number {
  return d.getHours() + d.getMinutes() / 60 + d.getSeconds() / 3600;
}

export function isNightTime(d: Date): boolean {
  const h = d.getHours();
  return h < 6 || h >= 21;
}

export interface SunInfo {
  dirX: number;
  dirY: number;
  dirZ: number;
  dayFactor: number;
  duskFactor: number;
}

function clamp01(v: number): number {
  return v < 0 ? 0 : v > 1 ? 1 : v;
}

export function computeSun(hour: number): SunInfo {
  const t = hour / 24;
  const phi = (t - 0.25) * Math.PI * 2;
  const elev = Math.sin(phi);
  const horizon = Math.sqrt(Math.max(0, 1 - elev * elev));

  let dirX = Math.cos(phi) * horizon;
  let dirY = elev;
  let dirZ = Math.sin(phi) * horizon;
  const len = Math.sqrt(dirX * dirX + dirY * dirY + dirZ * dirZ);
  if (len < 1e-6) {
    dirX = 0;
    dirY = 1;
    dirZ = 0;
  } else {
    dirX /= len;
    dirY /= len;
    dirZ /= len;
  }

  const dayFactor = clamp01(elev * 1.4 + 0.15);
  const duskFactor = clamp01(1 - Math.abs(elev) * 6) * dayFactor;
  return { dirX, dirY, dirZ, dayFactor, duskFactor };
}

export type Weather = "clear" | "cloudy" | "rain";

export interface AtmosphereColors {
  sunR: number;
  sunG: number;
  sunB: number;
  sunIntensity: number;
  skyR: number;
  skyG: number;
  skyB: number;
  fogR: number;
  fogG: number;
  fogB: number;
  fogDensity: number;
  ambR: number;
  ambG: number;
  ambB: number;
  starsOpacity: number;
}

function lerpChannel(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

function hexToRgb(hex: string): [number, number, number] {
  const n = parseInt(hex.slice(1), 16);
  return [(n >> 16) / 255, ((n >> 8) & 0xff) / 255, (n & 0xff) / 255];
}

const SUN_DAY = hexToRgb("#fff3dd");
const SUN_DUSK = hexToRgb("#ffb36b");
const SUN_CLOUDY = hexToRgb("#e6ebf2");
const SKY_DAY = hexToRgb("#a9cfe6");
const SKY_DUSK = hexToRgb("#f0c9a0");
const SKY_NIGHT = hexToRgb("#0b1622");
const SKY_CLOUDY = hexToRgb("#b8c4cc");
const FOG_DAY = hexToRgb("#d7e3d6");
const FOG_DUSK = hexToRgb("#d9c2a2");
const FOG_NIGHT = hexToRgb("#101a24");
const FOG_CLOUDY = hexToRgb("#aebbbf");
const AMB_DAY = hexToRgb("#e9f0ea");
const AMB_NIGHT = hexToRgb("#1c2836");

export function computeAtmosphere(hour: number, weather: Weather): AtmosphereColors {
  const { dayFactor, duskFactor } = computeSun(hour);

  const weatherDim = weather === "clear" ? 1 : weather === "cloudy" ? 0.55 : 0.35;
  const weatherFog = weather === "clear" ? 1 : weather === "cloudy" ? 1.8 : 2.6;

  const sunIntensity = Math.max(0.05, Math.pow(dayFactor, 1.3)) * weatherDim;

  let sunR = lerpChannel(SUN_DAY[0], SUN_DUSK[0], duskFactor);
  let sunG = lerpChannel(SUN_DAY[1], SUN_DUSK[1], duskFactor);
  let sunB = lerpChannel(SUN_DAY[2], SUN_DUSK[2], duskFactor);
  if (weather !== "clear") {
    const w = weather === "cloudy" ? 0.5 : 0.72;
    sunR = lerpChannel(sunR, SUN_CLOUDY[0], w);
    sunG = lerpChannel(sunG, SUN_CLOUDY[1], w);
    sunB = lerpChannel(sunB, SUN_CLOUDY[2], w);
  }

  let skyR = lerpChannel(SKY_DAY[0], SKY_NIGHT[0], 1 - dayFactor);
  let skyG = lerpChannel(SKY_DAY[1], SKY_NIGHT[1], 1 - dayFactor);
  let skyB = lerpChannel(SKY_DAY[2], SKY_NIGHT[2], 1 - dayFactor);
  if (duskFactor > 0.05) {
    const dk = duskFactor * 0.9;
    skyR = lerpChannel(skyR, SKY_DUSK[0], dk);
    skyG = lerpChannel(skyG, SKY_DUSK[1], dk);
    skyB = lerpChannel(skyB, SKY_DUSK[2], dk);
  }
  if (weather !== "clear") {
    const w = weather === "cloudy" ? 0.6 : 0.8;
    skyR = lerpChannel(skyR, SKY_CLOUDY[0], w);
    skyG = lerpChannel(skyG, SKY_CLOUDY[1], w);
    skyB = lerpChannel(skyB, SKY_CLOUDY[2], w);
  }

  let fogR = lerpChannel(FOG_DAY[0], FOG_NIGHT[0], 1 - dayFactor);
  let fogG = lerpChannel(FOG_DAY[1], FOG_NIGHT[1], 1 - dayFactor);
  let fogB = lerpChannel(FOG_DAY[2], FOG_NIGHT[2], 1 - dayFactor);
  if (duskFactor > 0.05) {
    const dk = duskFactor * 0.8;
    fogR = lerpChannel(fogR, FOG_DUSK[0], dk);
    fogG = lerpChannel(fogG, FOG_DUSK[1], dk);
    fogB = lerpChannel(fogB, FOG_DUSK[2], dk);
  }
  if (weather !== "clear") {
    const w = weather === "cloudy" ? 0.55 : 0.8;
    fogR = lerpChannel(fogR, FOG_CLOUDY[0], w);
    fogG = lerpChannel(fogG, FOG_CLOUDY[1], w);
    fogB = lerpChannel(fogB, FOG_CLOUDY[2], w);
  }
  const fogDensity = 0.00045 * weatherFog + (1 - dayFactor) * 0.00025;

  let ambR = lerpChannel(AMB_DAY[0], AMB_NIGHT[0], 1 - dayFactor);
  let ambG = lerpChannel(AMB_DAY[1], AMB_NIGHT[1], 1 - dayFactor);
  let ambB = lerpChannel(AMB_DAY[2], AMB_NIGHT[2], 1 - dayFactor);

  const starsOpacity = Math.pow(1 - dayFactor, 1.6);

  return {
    sunR, sunG, sunB, sunIntensity: sunIntensity * 2.4,
    skyR, skyG, skyB,
    fogR, fogG, fogB, fogDensity,
    ambR, ambG, ambB,
    starsOpacity,
  };
}
