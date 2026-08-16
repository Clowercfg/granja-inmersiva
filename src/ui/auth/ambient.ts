/**
 * Sonido ambiente sintetizado con WebAudio (sin archivos externos).
 * -----------------------------------------------------------------
 * - Viento: bucle de ruido blanco filtrado (pasabanda) con "oleaje" lento.
 * - Pájaros: trinos cortos programados de forma aleatoria.
 * - Todo se genera proceduralmente; basta el toggle del usuario.
 */

type Maybe<T> = T | null;

let ctx: Maybe<AudioContext> = null;
let master: Maybe<GainNode> = null;
let windGain: Maybe<GainNode> = null;
let chirpTimer: Maybe<number> = null;

function ensureCtx(): Maybe<AudioContext> {
  if (typeof window === "undefined") return null;
  if (!ctx) {
    const AC = window.AudioContext || (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!AC) return null;
    ctx = new AC();
  }
  return ctx;
}

/** Construye el nodo de viento (ruido coloreado en bucle). */
function buildWind(c: AudioContext): void {
  const len = c.sampleRate * 4;
  const buf = c.createBuffer(1, len, c.sampleRate);
  const data = buf.getChannelData(0);
  let last = 0;
  for (let i = 0; i < len; i++) {
    last = last * 0.982 + (Math.random() * 2 - 1) * 0.018;
    data[i] = last * 3.4;
  }
  const src = c.createBufferSource();
  src.buffer = buf;
  src.loop = true;

  const bp = c.createBiquadFilter();
  bp.type = "bandpass";
  bp.frequency.value = 340;
  bp.Q.value = 0.55;

  windGain = c.createGain();
  windGain.gain.value = 0;

  src.connect(bp).connect(windGain).connect(master as GainNode);
  src.start();

  // Oleaje lento del viento
  const lfo = c.createOscillator();
  lfo.frequency.value = 0.06;
  const lfoGain = c.createGain();
  lfoGain.gain.value = 0.06;
  lfo.connect(lfoGain).connect(windGain.gain);
  lfo.start();
}

/** Un trino de pájaro (2-3 notas cortas con pitch-bend). */
function chirp(c: AudioContext): void {
  const t = c.currentTime;
  const notes = 2 + Math.round(Math.random() * 2);
  for (let i = 0; i < notes; i++) {
    const start = t + i * (0.085 + Math.random() * 0.05);
    const freq = 2100 + Math.random() * 1000;
    const osc = c.createOscillator();
    osc.type = "sine";
    osc.frequency.setValueAtTime(freq, start);
    osc.frequency.exponentialRampToValueAtTime(freq * 0.82, start + 0.055);
    const g = c.createGain();
    g.gain.setValueAtTime(0.0001, start);
    g.gain.exponentialRampToValueAtTime(0.45, start + 0.018);
    g.gain.exponentialRampToValueAtTime(0.0001, start + 0.09);
    osc.connect(g).connect(master as GainNode);
    osc.start(start);
    osc.stop(start + 0.13);
  }
}

function scheduleNextChirp(): void {
  const c = ensureCtx();
  if (!c) return;
  const delay = 2200 + Math.random() * 4200;
  chirpTimer = window.setTimeout(() => {
    if (master) chirp(c);
    scheduleNextChirp();
  }, delay);
}

/** Enciende el ambiente. Debe llamarse desde un gesto de usuario. */
export async function startAmbient(): Promise<void> {
  const c = ensureCtx();
  if (!c) return;
  if (c.state === "suspended") await c.resume();
  if (!master) {
    master = c.createGain();
    master.gain.value = 0;
    master.connect(c.destination);
  }
  if (!windGain) buildWind(c);
  master.gain.cancelScheduledValues(c.currentTime);
  master.gain.setValueAtTime(Math.max(0.0001, master.gain.value), c.currentTime);
  master.gain.exponentialRampToValueAtTime(0.16, c.currentTime + 0.8);
  if (chirpTimer === null) scheduleNextChirp();
}

/** Apaga el ambiente de forma suave. */
export function stopAmbient(): void {
  const c = ctx;
  if (!c || !master) return;
  master.gain.cancelScheduledValues(c.currentTime);
  master.gain.setValueAtTime(Math.max(0.0001, master.gain.value), c.currentTime);
  master.gain.exponentialRampToValueAtTime(0.0001, c.currentTime + 0.6);
  if (chirpTimer !== null) {
    clearTimeout(chirpTimer);
    chirpTimer = null;
  }
}

/** Estado actual para sincronizar el toggle. */
export function isAmbientRunning(): boolean {
  return !!master && master.gain.value > 0.01;
}
