export interface SpriteDefinition {
  id: string;
  placeholder: "circle" | "rect" | "triangle";
  color: string;
  size: number;
}

const registry = new Map<string, SpriteDefinition>();

export function registerSprite(def: SpriteDefinition): void {
  registry.set(def.id, def);
}

export function getSprite(id: string): SpriteDefinition | undefined {
  return registry.get(id);
}

export function drawSprite(
  ctx: CanvasRenderingContext2D,
  def: SpriteDefinition,
  sx: number,
  sy: number,
  scale: number,
  rotation: number
): void {
  ctx.save();
  ctx.translate(sx, sy);
  ctx.rotate(rotation);
  const s = def.size * scale;

  if (def.placeholder === "circle") {
    ctx.beginPath();
    ctx.arc(0, 0, s / 2, 0, Math.PI * 2);
    ctx.fillStyle = def.color;
    ctx.fill();
  } else if (def.placeholder === "rect") {
    ctx.fillStyle = def.color;
    ctx.fillRect(-s / 2, -s / 2, s, s);
  } else {
    ctx.beginPath();
    ctx.moveTo(0, -s / 2);
    ctx.lineTo(-s / 2, s / 2);
    ctx.lineTo(s / 2, s / 2);
    ctx.closePath();
    ctx.fillStyle = def.color;
    ctx.fill();
  }

  ctx.restore();
}
