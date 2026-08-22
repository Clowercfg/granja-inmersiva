export type TickFn = (dt: number) => void;

const MAX_DT = 0.1;
const MIN_DT = 0.001;

let rafId = 0;
let lastTime = 0;
let running = false;
const tickFns: TickFn[] = [];

function loop(time: number): void {
  if (!running) return;

  if (lastTime === 0) {
    lastTime = time;
    rafId = requestAnimationFrame(loop);
    return;
  }

  let dt = (time - lastTime) / 1000;
  lastTime = time;

  if (dt < MIN_DT) {
    rafId = requestAnimationFrame(loop);
    return;
  }

  if (dt > MAX_DT) dt = MAX_DT;

  for (let i = 0; i < tickFns.length; i++) {
    tickFns[i](dt);
  }

  rafId = requestAnimationFrame(loop);
}

export function onTick(fn: TickFn): () => void {
  tickFns.push(fn);
  return () => {
    const i = tickFns.indexOf(fn);
    if (i >= 0) tickFns.splice(i, 1);
  };
}

export function startGameLoop(): void {
  if (running) return;
  running = true;
  lastTime = 0;
  rafId = requestAnimationFrame(loop);
}

export function stopGameLoop(): void {
  running = false;
  if (rafId) cancelAnimationFrame(rafId);
  rafId = 0;
}
