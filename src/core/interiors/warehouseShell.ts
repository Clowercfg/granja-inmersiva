import * as THREE from "three";
import type { InteriorDef } from "../../config/interiors";

const W = 13.8;
const D = 9.6;
const H = 4.3;
const WALL_T = 0.26;
const doorW = 4.0;
const doorH = 3.4;

const floorMat = new THREE.MeshStandardMaterial({ color: "#8d8d85", roughness: 0.95 });
const wallMat = new THREE.MeshStandardMaterial({ color: "#aeb4b8", roughness: 0.85, side: THREE.DoubleSide });
const wallInnerMat = new THREE.MeshStandardMaterial({ color: "#c2c6c9", roughness: 0.9, side: THREE.DoubleSide });
const ceilingMat = new THREE.MeshStandardMaterial({ color: "#9aa0a6", roughness: 0.95, side: THREE.DoubleSide });
const beamMat = new THREE.MeshStandardMaterial({ color: "#4a3524", roughness: 0.9 });
const frameMat = new THREE.MeshStandardMaterial({ color: "#3c2a1a", roughness: 0.85 });

function box(
  w: number,
  h: number,
  d: number,
  mat: THREE.Material,
  x = 0,
  y = 0,
  z = 0,
  side?: THREE.Side
): THREE.Mesh {
  const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat);
  if (side !== undefined) {
    (mat as THREE.MeshStandardMaterial).side = side;
  }
  m.position.set(x, y, z);
  m.castShadow = true;
  m.receiveShadow = true;
  return m;
}

export function buildWarehouseShell(_def: InteriorDef): THREE.Group {
  const g = new THREE.Group();
  const halfW = W / 2;
  const halfD = D / 2;

  g.add(box(W + 0.4, 0.26, D + 0.4, floorMat, 0, 0.13, 0));

  const sideSeg = (W - doorW) / 2;
  g.add(box(sideSeg, H, WALL_T, wallMat, -(doorW / 2 + sideSeg / 2), H / 2, halfD + WALL_T / 2, THREE.DoubleSide));
  g.add(box(sideSeg, H, WALL_T, wallMat, doorW / 2 + sideSeg / 2, H / 2, halfD + WALL_T / 2, THREE.DoubleSide));
  g.add(box(doorW + 1.0, H - doorH, WALL_T, wallMat, 0, doorH + (H - doorH) / 2, halfD + WALL_T / 2, THREE.DoubleSide));
  g.add(box(W, H, WALL_T, wallInnerMat, 0, H / 2, -halfD - WALL_T / 2, THREE.DoubleSide));
  g.add(box(WALL_T, H, D, wallInnerMat, -halfW - WALL_T / 2, H / 2, 0, THREE.DoubleSide));
  g.add(box(WALL_T, H, D, wallInnerMat, halfW + WALL_T / 2, H / 2, 0, THREE.DoubleSide));
  g.add(box(W + 0.4, 0.3, D + 0.4, ceilingMat, 0, H + 0.15, 0, THREE.DoubleSide));

  g.add(box(0.3, H, 0.26, frameMat, -doorW / 2, doorH / 2, halfD + WALL_T / 2 + 0.02));
  g.add(box(0.3, H, 0.26, frameMat, doorW / 2, doorH / 2, halfD + WALL_T / 2 + 0.02));
  g.add(box(doorW + 0.6, 0.3, 0.26, frameMat, 0, doorH, halfD + WALL_T / 2 + 0.02));

  g.add(box(W - 1.2, 0.18, 0.18, beamMat, 0, H - 0.32, -2.8));
  g.add(box(W - 1.2, 0.18, 0.18, beamMat, 0, H - 0.32, 2.8));
  for (const bx of [-4.4, 0, 4.4]) {
    g.add(box(0.18, 0.18, D - 1.0, beamMat, bx, H - 0.32, 0));
  }

  return g;
}
