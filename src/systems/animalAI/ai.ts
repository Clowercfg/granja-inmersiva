import type { AnimalAgent, AnimalBounds } from "../../types";
import { terrainHeight } from "../../utils/terrain";
import { WORLD } from "../../config/world";
import { OBSTACLES } from "../../config/layout";
import { getTreeColliders } from "../../entities/vegetation/vegetationData";
import { angLerp, clamp, lerp } from "../../utils/math";
import { timeManager } from "../time/TimeManager";

const cowSpeed = 1.5;
const chickenSpeed = 1.05;

interface Collider {
  x: number;
  z: number;
  r: number;
}

let colliders: Collider[] | null = null;

function getColliders(): Collider[] {
  if (!colliders) {
    colliders = [
      ...OBSTACLES.map((o) => ({ x: o.x, z: o.z, r: o.radius + 0.6 })),
      ...getTreeColliders().map((t) => ({ x: t.x, z: t.z, r: t.radius + 0.5 })),
    ];
  }
  return colliders;
}

export function createRandom(): () => number {
  let seed = Date.now() & 0xffff;
  return () => {
    seed = (seed * 1664525 + 1013904223) >>> 0;
    return seed / 4294967296;
  };
}

function randomPoint(bounds: AnimalBounds, rng: () => number, margin = 1.5): [number, number, number] {
  return [
    bounds.minX + margin + rng() * (bounds.maxX - bounds.minX - margin * 2),
    0,
    bounds.minZ + margin + rng() * (bounds.maxZ - bounds.minZ - margin * 2),
  ];
}

function clampToBounds(a: AnimalAgent, margin = 1.2): void {
  const b = a.bounds;
  a.position[0] = clamp(a.position[0], b.minX + margin, b.maxX - margin);
  a.position[2] = clamp(a.position[2], b.minZ + margin, b.maxZ - margin);
}

function isNight(): boolean {
  const h = timeManager.getNow().getHours();
  return h < 6 || h >= 21;
}

function pickState(a: AnimalAgent, rng: () => number): void {
  const r = rng();
  if (r < 0.3) {
    a.state = "rest";
    a.actionTimer = 2.5 + rng() * 5;
  } else if (r < 0.82) {
    a.state = "wander";
    a.target = randomPoint(a.bounds, rng);
    a.actionTimer = 0;
  } else {
    a.state = "eating";
    a.actionTimer = 4 + rng() * 7;
    a.target = [a.position[0], 0, a.position[2]];
  }
}

export function updateAgent(a: AnimalAgent, dt: number, rng: () => number, now: number): void {
  a.idlePhase += dt;
  const speed = a.kind === "cow" ? cowSpeed : chickenSpeed;
  const night = isNight();

  if (a.state === "wander") {
    a.walkPhase += dt * (1.2 + speed * 2.6);
  } else {
    a.walkPhase = 0;
  }

  // Durante la noche los animales descansan; de día alternan reposo/paseo/pastoreo.
  if (night) {
    if (a.state !== "sleep" && a.state !== "rest") {
      a.state = rng() < 0.85 ? "sleep" : "rest";
      a.actionTimer = 25 + rng() * 60;
      a.target = [a.position[0], 0, a.position[2]];
    } else {
      a.actionTimer -= dt;
      if (a.actionTimer <= 0) {
        a.state = rng() < 0.85 ? "sleep" : "rest";
        a.actionTimer = 25 + rng() * 60;
      }
    }
    a.mood = clamp(a.mood + dt * 0.01, 0.2, 1);
  } else {
    a.mood = clamp(a.mood + (a.state === "eating" ? dt * 0.02 : -dt * 0.006), 0.2, 1);
    if (a.state !== "wander") {
      a.actionTimer -= dt;
      if (a.actionTimer <= 0) pickState(a, rng);
    }
  }

  let vx = 0;
  let vz = 0;

  if (a.state === "wander") {
    let dx = a.target[0] - a.position[0];
    let dz = a.target[2] - a.position[2];
    const dist = Math.hypot(dx, dz);
    if (dist < 0.6) {
      pickState(a, rng);
    } else {
      dx /= dist;
      dz /= dist;
      vx = dx * speed;
      vz = dz * speed;

      for (const c of getColliders()) {
        const ox = a.position[0] - c.x;
        const oz = a.position[2] - c.z;
        const od = Math.hypot(ox, oz);
        const influence = c.r + 1.4;
        if (od < influence && od > 1e-4) {
          const strength = (influence - od) / influence;
          vx += (ox / od) * speed * strength * 3.2;
          vz += (oz / od) * speed * strength * 3.2;
        }
      }
    }
  }

  // Separación entre animales del mismo corral.
  const SEPARATION = a.kind === "cow" ? 2.4 : 0.7;
  const herd = a.kind === "cow" ? cowPenPositions : chickenPenPositions;
  for (const other of herd.values()) {
    if (!other || other.id === a.id) continue;
    const ox = a.position[0] - other.position[0];
    const oz = a.position[2] - other.position[2];
    const od = Math.hypot(ox, oz);
    if (od < SEPARATION && od > 1e-4) {
      const push = ((SEPARATION - od) / SEPARATION) * 1.6;
      vx += (ox / od) * push;
      vz += (oz / od) * push;
    }
  }

  if (Math.abs(vx) > 0.001 || Math.abs(vz) > 0.001) {
    const vl = Math.hypot(vx, vz);
    vx = (vx / vl) * speed;
    vz = (vz / vl) * speed;
  }

  const k = 1 - Math.exp(-6 * dt);
  a.velocity[0] = lerp(a.velocity[0], vx, k);
  a.velocity[1] = 0;
  a.velocity[2] = lerp(a.velocity[2], vz, k);

  a.position[0] = clamp(a.position[0] + a.velocity[0] * dt, -WORLD.half + 8, WORLD.half - 8);
  a.position[2] = clamp(a.position[2] + a.velocity[2] * dt, -WORLD.half + 8, WORLD.half - 8);
  clampToBounds(a);
  a.position[1] = terrainHeight(a.position[0], a.position[2]);

  const sp = Math.hypot(a.velocity[0], a.velocity[2]);
  if (sp > 0.15) {
    const targetRot = Math.atan2(a.velocity[0], a.velocity[2]);
    a.rotation = angLerp(a.rotation, targetRot, 1 - Math.exp(-8 * dt));
  }

  if (a.nextHarvestAt > 0 && now >= a.nextHarvestAt) {
    const eatBoost = a.state === "eating" ? 1.6 : 1;
    a.pendingProduction += (a.kind === "cow" ? 1.2 : 0.35) * eatBoost;
    a.nextHarvestAt = now + (a.kind === "cow" ? 45 : 30);
  }
}

// Registros ligeros para separación entre animales del mismo tipo.
const cowPenPositions = new Map<number, { id: number; position: [number, number, number] }>();
const chickenPenPositions = new Map<number, { id: number; position: [number, number, number] }>();

export function registerSeparation(a: AnimalAgent): void {
  const target = a.kind === "cow" ? cowPenPositions : chickenPenPositions;
  const entry = { id: a.id, position: a.position };
  target.set(a.id, entry);
}
