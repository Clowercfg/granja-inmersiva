import * as THREE from "three";

export const MAT = {
  woodDark: new THREE.MeshStandardMaterial({ color: "#5b3f27", roughness: 0.85 }),
  woodLight: new THREE.MeshStandardMaterial({ color: "#8a6438", roughness: 0.8 }),
  woodNew: new THREE.MeshStandardMaterial({ color: "#c08a4e", roughness: 0.75 }),
  barnRed: new THREE.MeshStandardMaterial({ color: "#9c3a2a", roughness: 0.7 }),
  roofRed: new THREE.MeshStandardMaterial({ color: "#7a2e22", roughness: 0.65 }),
  roofGray: new THREE.MeshStandardMaterial({ color: "#6e7377", roughness: 0.8 }),
  stone: new THREE.MeshStandardMaterial({ color: "#8d8d85", roughness: 0.95 }),
  concrete: new THREE.MeshStandardMaterial({ color: "#a9aaa4", roughness: 0.9 }),
  metal: new THREE.MeshStandardMaterial({ color: "#b8bcc0", roughness: 0.4, metalness: 0.7 }),
  metalDark: new THREE.MeshStandardMaterial({ color: "#7d8388", roughness: 0.5, metalness: 0.6 }),
  hay: new THREE.MeshStandardMaterial({ color: "#d8b34a", roughness: 1 }),
  whitePaint: new THREE.MeshStandardMaterial({ color: "#e8e2d4", roughness: 0.6 }),
  darkTrim: new THREE.MeshStandardMaterial({ color: "#3c2f22", roughness: 0.7 }),
  glass: new THREE.MeshStandardMaterial({ color: "#bcd6dd", roughness: 0.15, metalness: 0, transparent: true, opacity: 0.55 }),
  roofTiles: new THREE.MeshStandardMaterial({ color: "#5a4532", roughness: 0.9 }),
  brick: new THREE.MeshStandardMaterial({ color: "#a05a3a", roughness: 0.9 }),
};

function box(w: number, h: number, d: number, mat: THREE.Material, x = 0, y = 0, z = 0): THREE.Mesh {
  const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat);
  m.position.set(x, y, z);
  m.castShadow = true;
  m.receiveShadow = true;
  return m;
}

function cylinder(rTop: number, rBot: number, h: number, mat: THREE.Material, x = 0, y = 0, z = 0, seg = 24): THREE.Mesh {
  const m = new THREE.Mesh(new THREE.CylinderGeometry(rTop, rBot, h, seg), mat);
  m.position.set(x, y, z);
  m.castShadow = true;
  m.receiveShadow = true;
  return m;
}

function planks(w: number, h: number, d: number, mat: THREE.MeshStandardMaterial, x = 0, y = 0, z = 0): THREE.Mesh {
  const geo = new THREE.BoxGeometry(w, h, d, 1, 1, 1);
  const pos = geo.attributes.position;
  const colors = new Float32Array(pos.count * 3);
  const base = new THREE.Color(mat.color);
  for (let i = 0; i < pos.count; i++) {
    const t = ((i * 37) % 100) / 100;
    base.clone().multiplyScalar(0.85 + t * 0.3).toArray(colors, i * 3);
  }
  geo.setAttribute("color", new THREE.BufferAttribute(colors, 3));
  const m = new THREE.Mesh(geo, mat);
  m.position.set(x, y, z);
  m.castShadow = true;
  m.receiveShadow = true;
  return m;
}

function gableRoof(len: number, width: number, peak: number, eave: number, mat: THREE.Material): THREE.Mesh {
  const shape = new THREE.Shape();
  shape.moveTo(-len / 2, eave);
  shape.lineTo(0, peak);
  shape.lineTo(len / 2, eave);
  shape.lineTo(len / 2, eave - 0.4);
  shape.lineTo(-len / 2, eave - 0.4);
  shape.closePath();
  const geo = new THREE.ExtrudeGeometry(shape, { depth: width, bevelEnabled: false });
  geo.translate(0, 0, -width / 2);
  geo.rotateY(Math.PI / 2);
  geo.computeVertexNormals();
  const m = new THREE.Mesh(geo, mat);
  m.castShadow = true;
  m.receiveShadow = true;
  return m;
}

export function buildBarn(): THREE.Group {
  const g = new THREE.Group();

  g.add(box(16.6, 0.5, 11.6, MAT.stone, 0, 0.25, 0));
  g.add(planks(16.2, 4, 0.28, MAT.barnRed, 0, 2.25, 5.6));
  g.add(planks(16.2, 4, 0.28, MAT.barnRed, 0, 2.25, -5.6));
  g.add(planks(0.28, 4, 11.4, MAT.barnRed, -8, 2.25, 0));
  g.add(planks(0.28, 4, 11.4, MAT.barnRed, 8, 2.25, 0));

  const shape = new THREE.Shape();
  shape.moveTo(-8, 4);
  shape.lineTo(-2.6, 6.1);
  shape.lineTo(0, 7.6);
  shape.lineTo(2.6, 6.1);
  shape.lineTo(8, 4);
  shape.lineTo(8, 3.6);
  shape.lineTo(-8, 3.6);
  shape.closePath();

  const roofGeo = new THREE.ExtrudeGeometry(shape, { depth: 16.6, bevelEnabled: false });
  roofGeo.translate(0, 0, -8.3);
  roofGeo.rotateY(Math.PI / 2);
  roofGeo.computeVertexNormals();
  const roof = new THREE.Mesh(roofGeo, MAT.roofRed);
  roof.castShadow = true;
  roof.receiveShadow = true;
  g.add(roof);

  g.add(box(0.6, 0.5, 17.2, MAT.darkTrim, 0, 7.85, 0));

  g.add(box(2.7, 3.3, 0.2, MAT.woodDark, -2.9, 1.65, 5.72));
  g.add(box(2.7, 3.3, 0.2, MAT.woodDark, 2.9, 1.65, 5.72));
  g.add(box(3, 0.35, 0.25, MAT.metalDark, -2.9, 3.25, 5.72));
  g.add(box(3, 0.35, 0.25, MAT.metalDark, 2.9, 3.25, 5.72));
  g.add(box(0.3, 3.5, 0.28, MAT.darkTrim, 0, 1.75, 5.72));

  g.add(box(2.2, 1.9, 0.16, MAT.woodLight, 5.4, 3.6, 5.75));
  g.add(box(0.24, 1.9, 0.2, MAT.whitePaint, 4.28, 3.6, 5.78));
  g.add(box(0.24, 1.9, 0.2, MAT.whitePaint, 6.52, 3.6, 5.78));

  g.add(cylinder(0.12, 0.12, 1, MAT.hay, -5.6, 4.5, -4.2, 6));
  g.add(cylinder(0.12, 0.12, 1, MAT.hay, -5.6, 4.5, -2.8, 6));
  g.add(box(2.2, 1.1, 1.6, MAT.hay, -5.6, 3.4, -3.5));

  return g;
}

export function buildHouse(): THREE.Group {
  const g = new THREE.Group();

  g.add(box(11.2, 0.5, 9.2, MAT.stone, 0, 0.25, 0));
  g.add(box(11, 2.7, 9, MAT.whitePaint, 0, 1.6, 0));
  g.add(box(11.5, 0.35, 9.5, MAT.darkTrim, 0, 2.95, 0));

  const roof = gableRoof(11.4, 10.4, 4.9, 3.0, MAT.roofTiles);
  g.add(roof);

  g.add(box(1.4, 2.3, 0.14, MAT.woodDark, -3.4, 1.15, 4.6));
  g.add(box(0.28, 2.3, 0.16, MAT.darkTrim, -4.25, 1.15, 4.62));
  g.add(box(0.28, 2.3, 0.16, MAT.darkTrim, -2.55, 1.15, 4.62));
  g.add(box(1.6, 0.3, 0.18, MAT.darkTrim, -3.4, 2.35, 4.62));

  const winGeo = box(1.4, 1.3, 0.1, MAT.glass, 2.6, 2.0, 4.62);
  g.add(winGeo);
  g.add(box(0.14, 1.3, 0.14, MAT.whitePaint, 2.6, 2.0, 4.66));
  g.add(box(0.14, 1.3, 0.14, MAT.whitePaint, 3.34, 2.0, 4.66));
  g.add(box(1.4, 0.14, 0.14, MAT.whitePaint, 2.97, 2.0, 4.66));
  g.add(box(1.4, 0.14, 0.14, MAT.whitePaint, 2.97, 2.66, 4.66));

  g.add(cylinder(0.5, 0.6, 0.5, MAT.stone, 5.4, 0.25, 3.2, 14));
  g.add(cylinder(0.5, 0.6, 0.5, MAT.stone, -5.4, 0.25, 3.2, 14));
  g.add(box(9.8, 0.2, 1.8, MAT.woodLight, 0, 0.35, 3.1));
  g.add(box(0.9, 0.14, 1.3, MAT.woodDark, -0.45, 0.7, 3.1));

  return g;
}

export function buildWarehouse(): THREE.Group {
  const g = new THREE.Group();

  g.add(box(14.4, 0.5, 10.4, MAT.concrete, 0, 0.25, 0));
  g.add(planks(14, 4.4, 0.3, MAT.metal, 0, 2.45, 5.1));
  g.add(planks(14, 4.4, 0.3, MAT.metal, 0, 2.45, -5.1));
  g.add(planks(0.3, 4.4, 9.8, MAT.metal, -7, 2.45, 0));
  g.add(planks(0.3, 4.4, 9.8, MAT.metal, 7, 2.45, 0));

  g.add(box(14.8, 0.5, 10.8, MAT.roofGray, 0, 4.9, 0));
  g.add(box(14.8, 0.3, 10.8, MAT.darkTrim, 0, 4.7, 0));
  g.add(box(15.2, 0.8, 11.2, MAT.darkTrim, 0, 5.2, 0));

  g.add(box(4, 4.2, 0.24, MAT.woodDark, 0, 2.1, 5.25));
  g.add(box(4.4, 0.4, 0.3, MAT.metalDark, 0, 4.3, 5.3));
  g.add(box(0.3, 4.2, 0.24, MAT.darkTrim, 0, 2.1, 5.25));
  g.add(box(0.3, 4.2, 0.24, MAT.darkTrim, -2, 2.1, 5.25));
  g.add(box(0.3, 4.2, 0.24, MAT.darkTrim, 2, 2.1, 5.25));

  g.add(box(1.8, 1.6, 0.1, MAT.glass, 4.6, 3.2, 5.2));
  g.add(box(0.16, 1.6, 0.12, MAT.darkTrim, 3.72, 3.2, 5.22));
  g.add(box(0.16, 1.6, 0.12, MAT.darkTrim, 5.48, 3.2, 5.22));
  g.add(box(1.8, 0.16, 0.12, MAT.darkTrim, 4.6, 3.2, 5.22));

  return g;
}

export function buildGreenhouse(): THREE.Group {
  const g = new THREE.Group();

  g.add(box(12.4, 0.4, 8.4, MAT.concrete, 0, 0.2, 0));
  g.add(box(12, 0.14, 8, MAT.woodLight, 0, 0.4, 0));

  const shape = new THREE.Shape();
  shape.moveTo(-6, 0.4);
  shape.lineTo(-6, 2.2);
  shape.lineTo(-4.6, 3.2);
  shape.lineTo(0, 3.7);
  shape.lineTo(4.6, 3.2);
  shape.lineTo(6, 2.2);
  shape.lineTo(6, 0.4);
  shape.closePath();

  const glassGeo = new THREE.ExtrudeGeometry(shape, { depth: 8, bevelEnabled: false });
  glassGeo.translate(0, 0, -4);
  glassGeo.rotateY(Math.PI / 2);
  glassGeo.computeVertexNormals();
  const glass = new THREE.Mesh(glassGeo, MAT.glass);
  glass.castShadow = true;
  glass.receiveShadow = true;
  g.add(glass);

  const frame = new THREE.Mesh(
    new THREE.BoxGeometry(0.18, 3.4, 8.1),
    MAT.woodDark
  );
  frame.position.set(-6, 1.7, 0);
  frame.castShadow = true;
  g.add(frame);
  const frame2 = frame.clone();
  frame2.position.x = 6;
  g.add(frame2);

  for (const z of [-4, 0, 4]) {
    const beam = box(12.4, 0.16, 0.16, MAT.woodDark, 0, 2.2, z);
    g.add(beam);
  }

  g.add(box(2, 2, 0.1, MAT.woodDark, 0, 1, 4.15));
  g.add(box(2.4, 0.3, 0.14, MAT.darkTrim, 0, 2.05, 4.15));

  for (let i = 0; i < 3; i++) {
    const plant = new THREE.Mesh(
      new THREE.SphereGeometry(0.55, 12, 10),
      MAT.woodNew
    );
    plant.position.set(-3.5 + i * 3.5, 1.1, -1.8 + (i % 2) * 3.6);
    plant.scale.y = 0.7;
    plant.castShadow = true;
    g.add(plant);
  }

  return g;
}

export function buildWorkshop(): THREE.Group {
  const g = new THREE.Group();

  g.add(box(10.4, 0.45, 8.4, MAT.concrete, 0, 0.23, 0));
  g.add(planks(10, 2.8, 0.26, MAT.woodLight, 0, 1.55, 4.1));
  g.add(planks(10, 2.8, 0.26, MAT.woodLight, 0, 1.55, -4.1));
  g.add(planks(0.26, 2.8, 7.9, MAT.woodLight, -5, 1.55, 0));
  g.add(planks(0.26, 2.8, 7.9, MAT.woodLight, 5, 1.55, 0));

  const roof = gableRoof(10.4, 9.4, 3.9, 2.8, MAT.roofGray);
  g.add(roof);

  g.add(box(1.8, 2.5, 0.14, MAT.woodDark, -2.2, 1.25, 4.25));
  g.add(box(0.26, 2.5, 0.16, MAT.darkTrim, -3.05, 1.25, 4.27));
  g.add(box(0.26, 2.5, 0.16, MAT.darkTrim, -1.35, 1.25, 4.27));
  g.add(box(1.6, 1.2, 0.1, MAT.glass, 2.6, 1.9, 4.25));
  g.add(box(0.14, 1.2, 0.12, MAT.darkTrim, 1.82, 1.9, 4.27));
  g.add(box(0.14, 1.2, 0.12, MAT.darkTrim, 3.38, 1.9, 4.27));

  g.add(box(2.2, 1, 1.4, MAT.woodDark, 0, 0.7, -3.2));
  g.add(box(0.35, 0.6, 0.5, MAT.metal, 1.4, 0.85, -2.7));
  g.add(cylinder(0.4, 0.4, 0.6, MAT.metalDark, -1.3, 0.5, -3.1, 10));
  g.add(box(0.4, 2.2, 0.4, MAT.woodDark, 3.4, 1.4, 3.2));
  g.add(box(0.4, 0.5, 2, MAT.woodLight, 3.4, 0.3, 3.2));

  return g;
}

export function buildFence(): THREE.Group {
  const g = new THREE.Group();
  const len = 6;
  for (const x of [-3, 3]) {
    const post = cylinder(0.09, 0.11, 1.1, MAT.woodDark, x, 0.55, 0, 8);
    g.add(post);
  }
  g.add(box(len, 0.12, 0.1, MAT.woodLight, 0, 0.72, 0));
  g.add(box(len, 0.12, 0.1, MAT.woodLight, 0, 0.36, 0));
  return g;
}

export function buildFenceGate(): THREE.Group {
  const g = new THREE.Group();
  const half = 1.8;
  for (const x of [-half, half]) {
    const post = cylinder(0.14, 0.17, 1.4, MAT.woodDark, x, 0.7, 0, 10);
    g.add(post);
  }
  g.add(box(4, 0.12, 0.1, MAT.woodNew, 0, 0.95, 0));
  g.add(box(4, 0.12, 0.1, MAT.woodNew, 0, 0.5, 0));
  g.add(box(0.3, 0.9, 0.16, MAT.metalDark, 0, 0.72, 0));
  g.add(box(0.14, 0.14, 0.14, MAT.metalDark, 0, 0.32, 0));
  return g;
}

/** Barandilla de corral: dos tablas sobre postes, para segmentos largos. */
export function buildPenRail(length: number): THREE.Group {
  const g = new THREE.Group();
  const posts = Math.max(2, Math.round(length / 3) + 1);
  for (let i = 0; i < posts; i++) {
    const t = posts === 1 ? 0 : i / (posts - 1);
    const x = (t - 0.5) * length;
    const post = cylinder(0.1, 0.13, 1.4, MAT.woodDark, x, 0.7, 0, 8);
    g.add(post);
  }
  g.add(box(length, 0.14, 0.12, MAT.woodLight, 0, 1.0, 0));
  g.add(box(length, 0.14, 0.12, MAT.woodLight, 0, 0.52, 0));
  return g;
}
