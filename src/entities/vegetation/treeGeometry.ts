import * as THREE from "three";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";

const TRUNK_BROWN = new THREE.Color("#6d4a2f");
const TRUNK_DARK = new THREE.Color("#4a3322");
const LEAF_DARK = new THREE.Color("#2f5d2a");
const LEAF_MID = new THREE.Color("#4c7a35");
const LEAF_LIGHT = new THREE.Color("#6b9445");

function jitterColor(base: THREE.Color, amount: number, seed: number): THREE.Color {
  const c = base.clone();
  const r = (seed * 9301 + 49297) % 233280;
  const t = r / 233280;
  c.offsetHSL((t - 0.5) * 0.03, (t - 0.5) * 0.15, (t - 0.5) * amount);
  return c;
}

function addVertexColors(geo: THREE.BufferGeometry, base: THREE.Color, amount: number, seed: number): void {
  const pos = geo.attributes.position;
  const colors = new Float32Array(pos.count * 3);
  for (let i = 0; i < pos.count; i++) {
    const c = jitterColor(base, amount, seed + i);
    colors[i * 3] = c.r;
    colors[i * 3 + 1] = c.g;
    colors[i * 3 + 2] = c.b;
  }
  geo.setAttribute("color", new THREE.BufferAttribute(colors, 3));
}

export function buildTreeGeometry(): THREE.BufferGeometry {
  const parts: THREE.BufferGeometry[] = [];

  const trunk = new THREE.CylinderGeometry(0.16, 0.3, 1.9, 7, 2);
  trunk.translate(0, 0.95, 0);
  addVertexColors(trunk, TRUNK_BROWN, 0.14, 3);
  parts.push(trunk);

  const b1 = new THREE.IcosahedronGeometry(1.15, 1);
  b1.scale(1, 0.88, 1);
  b1.translate(0, 2.15, 0);
  addVertexColors(b1, LEAF_DARK, 0.16, 11);
  parts.push(b1);

  const b2 = new THREE.IcosahedronGeometry(0.9, 1);
  b2.scale(1.05, 0.92, 1.05);
  b2.translate(0.25, 2.85, 0.12);
  addVertexColors(b2, LEAF_MID, 0.16, 23);
  parts.push(b2);

  const b3 = new THREE.IcosahedronGeometry(0.62, 1);
  b3.scale(1, 0.9, 1);
  b3.translate(-0.15, 3.35, -0.1);
  addVertexColors(b3, LEAF_LIGHT, 0.12, 37);
  parts.push(b3);

  const nonIndexed = parts.map((p) => (p.index ? p.toNonIndexed() : p));
  const merged = mergeGeometries(nonIndexed);
  if (!merged) throw new Error("tree geometry merge failed");
  merged.computeVertexNormals();
  return merged;
}
