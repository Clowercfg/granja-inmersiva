const cache = new Map<string, HTMLImageElement | HTMLCanvasElement>();
const pending = new Map<string, Promise<void>>();

export function getSprite(key: string): HTMLImageElement | HTMLCanvasElement | null {
  return cache.get(key) ?? null;
}

export function isSpriteLoaded(key: string): boolean {
  return cache.has(key);
}

export function loadSprite(key: string, url: string): void {
  if (cache.has(key) || pending.has(key)) return;
  const promise = new Promise<void>((resolve) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => { cache.set(key, img); pending.delete(key); resolve(); };
    img.onerror = () => { pending.delete(key); resolve(); };
    img.src = url;
  });
  pending.set(key, promise);
}

export function generateSprite(
  key: string,
  width: number,
  height: number,
  draw: (ctx: CanvasRenderingContext2D) => void
): void {
  if (cache.has(key)) return;
  const c = document.createElement("canvas");
  c.width = width;
  c.height = height;
  const ctx = c.getContext("2d");
  if (ctx) {
    draw(ctx);
    cache.set(key, c);
  }
}

export async function waitForSprites(): Promise<void> {
  if (pending.size === 0) return;
  await Promise.all(pending.values());
}
