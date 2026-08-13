import { useMemo } from "react";
import * as THREE from "three";
import type { InteriorDef } from "../../config/interiors";

const W = 15.2;
const D = 10.4;
const H = 6.4;

const WALL_T = 0.26;

const doorW = 4.4;
const doorH = 4.2;

const floorMat = new THREE.MeshStandardMaterial({ color: "#9a7748", roughness: 0.9 });
const wallMat = new THREE.MeshStandardMaterial({ color: "#c8b18a", roughness: 0.85, side: THREE.DoubleSide });
const wallInnerMat = new THREE.MeshStandardMaterial({ color: "#d9c49a", roughness: 0.9, side: THREE.DoubleSide });
const ceilingMat = new THREE.MeshStandardMaterial({ color: "#6e5a3c", roughness: 0.95, side: THREE.DoubleSide });
const beamMat = new THREE.MeshStandardMaterial({ color: "#4a3524", roughness: 0.9 });
const frameMat = new THREE.MeshStandardMaterial({ color: "#3c2a1a", roughness: 0.85 });
const shelfMat = new THREE.MeshStandardMaterial({ color: "#b08954", roughness: 0.8 });
const crateMat = new THREE.MeshStandardMaterial({ color: "#8a623c", roughness: 0.9 });
const palletMat = new THREE.MeshStandardMaterial({ color: "#c2955f", roughness: 0.9 });
const hayMat = new THREE.MeshStandardMaterial({ color: "#d8b34a", roughness: 1 });
const toolMat = new THREE.MeshStandardMaterial({ color: "#5f4a2e", roughness: 0.85 });
const metalMat = new THREE.MeshStandardMaterial({ color: "#9aa0a6", roughness: 0.5, metalness: 0.6 });
const benchMat = new THREE.MeshStandardMaterial({ color: "#7a5c33", roughness: 0.85 });
const lampMat = new THREE.MeshStandardMaterial({ color: "#f3dc9a", emissive: "#c9a75a", emissiveIntensity: 1.6 });
const zoneMat = new THREE.MeshStandardMaterial({ color: "#5c4a30", roughness: 1 });

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

function cyl(
  r: number,
  h: number,
  mat: THREE.Material,
  x = 0,
  y = 0,
  z = 0,
  seg = 12
): THREE.Mesh {
  const m = new THREE.Mesh(new THREE.CylinderGeometry(r, r, h, seg), mat);
  m.position.set(x, y, z);
  m.castShadow = true;
  m.receiveShadow = true;
  return m;
}

function shelvingUnit(x: number, z: number): THREE.Group {
  const g = new THREE.Group();
  g.add(box(0.09, H * 0.55, 1.8, beamMat, x, H * 0.28, z));
  g.add(box(0.09, H * 0.55, 1.8, beamMat, x - 0.62, H * 0.28, z));
  const shelfY = [1.0, 1.9, 2.8];
  for (const sy of shelfY) {
    g.add(box(0.62, 0.06, 1.8, shelfMat, x - 0.31, sy, z));
  }
  g.add(box(0.42, 0.38, 0.5, crateMat, x - 0.22, 1.22, z + 0.3));
  g.add(box(0.46, 0.42, 0.52, crateMat, x - 0.26, 2.12, z - 0.4));
  return g;
}

function palletStack(x: number, z: number): THREE.Group {
  const g = new THREE.Group();
  g.add(box(1.5, 0.12, 1.5, palletMat, x, 0.06, z));
  g.add(box(1.5, 0.08, 0.16, palletMat, x, 0.14, z + 0.6));
  g.add(box(1.5, 0.08, 0.16, palletMat, x, 0.14, z - 0.6));
  g.add(box(0.9, 0.6, 0.7, hayMat, x - 0.32, 0.5, z - 0.35));
  g.add(box(0.9, 0.6, 0.7, hayMat, x + 0.32, 0.5, z + 0.35));
  g.add(box(0.9, 0.6, 0.7, hayMat, x, 1.15, z));
  return g;
}

function crateStack(x: number, z: number, n: number): THREE.Group {
  const g = new THREE.Group();
  for (let i = 0; i < n; i++) {
    const s = 0.82 - i * 0.1;
    g.add(box(s, s * 0.62, s, crateMat, x, (s * 0.62) / 2 + i * (s * 0.62) + 0.02, z));
  }
  return g;
}

function workbench(x: number, z: number): THREE.Group {
  const g = new THREE.Group();
  g.add(box(2.3, 0.08, 0.78, benchMat, x, 0.96, z));
  g.add(box(0.09, 0.96, 0.7, frameMat, x - 1.05, 0.48, z));
  g.add(box(0.09, 0.96, 0.7, frameMat, x + 1.05, 0.48, z));
  g.add(box(0.5, 0.12, 0.66, frameMat, x - 0.35, 0.58, z));
  return g;
}

function leaningTool(x: number, z: number, yaw: number, kind: "shovel" | "fork" | "broom"): THREE.Group {
  const g = new THREE.Group();
  g.rotation.y = yaw;
  const lean = 0.22;
  if (kind === "shovel") {
    g.add(cyl(0.032, 1.6, toolMat, x, 1.1, z));
    g.add(box(0.3, 0.34, 0.02, metalMat, x, 0.18, z - 0.02));
  } else if (kind === "fork") {
    g.add(cyl(0.03, 1.55, toolMat, x, 1.1, z));
    for (const px of [-0.09, 0, 0.09]) {
      g.add(box(0.02, 0.3, 0.018, metalMat, x + px, 0.16, z));
    }
  } else {
    g.add(cyl(0.026, 1.5, toolMat, x, 1.05, z));
    g.add(box(0.14, 0.3, 0.05, hayMat, x, 0.2, z));
  }
  g.rotation.x = lean;
  return g;
}

export function buildBarnInterior(_def: InteriorDef): THREE.Group {
  const g = new THREE.Group();
  const halfW = W / 2;
  const halfD = D / 2;

  g.add(box(W + 0.4, 0.28, D + 0.4, floorMat, 0, 0.14, 0));

  const sideSeg = (W - doorW) / 2;
  g.add(box(sideSeg, H, WALL_T, wallMat, -(doorW / 2 + sideSeg / 2), H / 2, halfD + WALL_T / 2, THREE.DoubleSide));
  g.add(box(sideSeg, H, WALL_T, wallMat, doorW / 2 + sideSeg / 2, H / 2, halfD + WALL_T / 2, THREE.DoubleSide));
  g.add(box(doorW + 1.0, H - doorH, WALL_T, wallMat, 0, doorH + (H - doorH) / 2, halfD + WALL_T / 2, THREE.DoubleSide));
  g.add(box(W, H, WALL_T, wallMat, 0, H / 2, -halfD - WALL_T / 2, THREE.DoubleSide));
  g.add(box(WALL_T, H, D, wallInnerMat, -halfW - WALL_T / 2, H / 2, 0, THREE.DoubleSide));
  g.add(box(WALL_T, H, D, wallInnerMat, halfW + WALL_T / 2, H / 2, 0, THREE.DoubleSide));
  g.add(box(W + 0.4, 0.3, D + 0.4, ceilingMat, 0, H + 0.15, 0, THREE.DoubleSide));

  g.add(box(0.3, H, 0.26, frameMat, -doorW / 2, doorH / 2, halfD + WALL_T / 2 + 0.02));
  g.add(box(0.3, H, 0.26, frameMat, doorW / 2, doorH / 2, halfD + WALL_T / 2 + 0.02));
  g.add(box(doorW + 0.6, 0.3, 0.26, frameMat, 0, doorH, halfD + WALL_T / 2 + 0.02));

  g.add(box(W - 1.4, 0.22, 0.22, beamMat, 0, H - 0.42, -3.1));
  g.add(box(W - 1.4, 0.22, 0.22, beamMat, 0, H - 0.42, 3.1));
  for (const bx of [-5.0, 0, 5.0]) {
    g.add(box(0.22, 0.22, D - 1.0, beamMat, bx, H - 0.42, 0));
  }

  for (const [px, pz] of [
    [-halfW + 0.6, -halfD + 0.5],
    [-halfW + 0.6, halfD - 0.5],
    [halfW - 0.6, -halfD + 0.5],
    [halfW - 0.6, halfD - 0.5],
  ]) {
    g.add(cyl(0.16, H, beamMat, px, H / 2, pz));
  }

  shelvingUnit(-halfW + 0.42, -2.7);
  shelvingUnit(-halfW + 0.42, 1.6);

  palletStack(halfW - 1.15, -3.2);
  palletStack(halfW - 1.15, -0.2);
  palletStack(halfW - 1.15, 2.8);

  crateStack(-halfW + 1.5, 3.6, 2);
  crateStack(-halfW + 1.5, -3.8, 2);

  g.add(box(3.0, 0.06, 2.4, zoneMat, -halfW + 1.2, 0.02, 0));
  g.add(box(3.0, 0.06, 2.4, zoneMat, halfW - 1.2, 0.02, -0.5));
  g.add(box(2.2, 0.06, 2.4, zoneMat, 0, 0.02, -halfD + 0.9));

  workbench(-3.6, -halfD + 1.0);
  g.add(box(2.6, 0.16, 0.6, frameMat, 3.6, 0.55, -halfD + 1.0));
  leaningTool(2.5, -halfD + 1.35, -0.5, "shovel");
  leaningTool(2.95, -halfD + 1.35, -0.5, "fork");
  leaningTool(3.35, -halfD + 1.35, -0.5, "broom");

  for (const [lx, lz] of [
    [0, 0],
    [-4.4, -4.2],
    [4.6, 3.0],
  ]) {
    const lamp = box(0.28, 0.12, 0.28, lampMat, lx, H - 0.3, lz);
    g.add(lamp);
    g.add(cyl(0.02, 0.5, frameMat, lx, H - 0.62, lz));
  }

  return g;
}

export function BarnInterior({ def }: { def: InteriorDef }) {
  const group = useMemo(() => buildBarnInterior(def), [def]);
  return (
    <group>
      <primitive object={group} />
      <pointLight position={[0, 5.0, 0]} intensity={26} distance={26} decay={1.6} color="#ffdfae" />
      <pointLight position={[-4.4, 4.4, -4.2]} intensity={18} distance={18} decay={1.6} color="#ffd9a8" />
      <pointLight position={[4.6, 4.2, 3.0]} intensity={16} distance={16} decay={1.6} color="#ffe3bd" />
      <hemisphereLight args={["#fff3e0", "#5c4526", 0.65]} />
    </group>
  );
}
