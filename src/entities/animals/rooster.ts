import * as THREE from "three";

export interface RoosterParts {
  body: THREE.Mesh;
  head: THREE.Group;
  wings: THREE.Mesh[];
  legs: THREE.Group[];
  tail: THREE.Group;
  phaseOffset: number[];
}

export function buildRooster(): THREE.Group & { userData: { parts: RoosterParts } } {
  const g = new THREE.Group();

  const copper = new THREE.MeshStandardMaterial({ color: "#b0562e", roughness: 0.85 });
  const featherDark = new THREE.MeshStandardMaterial({ color: "#5a3b22", roughness: 0.9 });
  const chest = new THREE.MeshStandardMaterial({ color: "#e07a3d", roughness: 0.8 });
  const comb = new THREE.MeshStandardMaterial({ color: "#c9251d", roughness: 0.55 });
  const beakMat = new THREE.MeshStandardMaterial({ color: "#e8a33d", roughness: 0.7 });
  const legMat = new THREE.MeshStandardMaterial({ color: "#d9a13d", roughness: 0.8 });

  const body = new THREE.Mesh(new THREE.SphereGeometry(0.36, 14, 10), copper);
  body.scale.set(1, 0.92, 1.2);
  body.position.set(0, 0.44, 0);
  g.add(body);

  const chestMesh = new THREE.Mesh(new THREE.SphereGeometry(0.28, 12, 9), chest);
  chestMesh.scale.set(0.82, 1.05, 1.15);
  chestMesh.position.set(0, 0.36, 0.3);
  g.add(chestMesh);

  const head = new THREE.Group();
  head.position.set(0, 0.78, 0.3);
  const skull = new THREE.Mesh(new THREE.SphereGeometry(0.15, 10, 8), copper);
  skull.scale.set(1, 1.12, 1);
  head.add(skull);
  const beak = new THREE.Mesh(new THREE.ConeGeometry(0.05, 0.16, 6), beakMat);
  beak.rotation.x = Math.PI / 2;
  beak.position.set(0, -0.02, 0.2);
  head.add(beak);
  const combTop = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.1, 0.05), comb);
  combTop.position.set(0, 0.18, 0.05);
  combTop.rotation.x = 0.35;
  head.add(combTop);
  const combBack = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.08, 0.04), comb);
  combBack.position.set(-0.04, 0.13, 0.03);
  combBack.rotation.x = 0.7;
  head.add(combBack);
  const wattle = new THREE.Mesh(new THREE.SphereGeometry(0.03, 6, 5), comb);
  wattle.position.set(0, -0.08, 0.14);
  wattle.scale.y = 1.6;
  head.add(wattle);
  const eyeMat = new THREE.MeshStandardMaterial({ color: "#1a1512", roughness: 0.3 });
  const eyeL = new THREE.Mesh(new THREE.SphereGeometry(0.026, 6, 5), eyeMat);
  eyeL.position.set(-0.11, 0.05, 0.13);
  const eyeR = new THREE.Mesh(new THREE.SphereGeometry(0.026, 6, 5), eyeMat);
  eyeR.position.set(0.11, 0.05, 0.13);
  head.add(eyeL, eyeR);
  g.add(head);

  const wings: THREE.Mesh[] = [];
  for (const sx of [-1, 1]) {
    const wing = new THREE.Mesh(new THREE.SphereGeometry(0.19, 10, 8), featherDark);
    wing.scale.set(0.42, 1, 1.5);
    wing.position.set(sx * 0.36, 0.46, -0.02);
    wing.rotation.y = sx * 0.35;
    g.add(wing);
    wings.push(wing);
  }

  const legs: THREE.Group[] = [];
  for (const sx of [-1, 1]) {
    const leg = new THREE.Group();
    leg.position.set(sx * 0.14, 0.15, 0);
    const shank = new THREE.Mesh(new THREE.CylinderGeometry(0.028, 0.028, 0.3, 6), legMat);
    shank.position.set(0, -0.15, 0);
    leg.add(shank);
    g.add(leg);
    legs.push(leg);
  }

  const tail = new THREE.Group();
  tail.position.set(0, 0.56, -0.4);
  for (let i = 0; i < 5; i++) {
    const f = new THREE.Mesh(new THREE.ConeGeometry(0.05, 0.34, 5), i % 2 ? featherDark : copper);
    f.rotation.x = -1.05;
    f.position.set((i - 2) * 0.085, 0.06, -0.12);
    f.rotation.z = (i - 2) * 0.34;
    tail.add(f);
  }
  g.add(tail);

  const userData: RoosterParts = {
    body,
    head,
    wings,
    legs,
    tail,
    phaseOffset: [0, Math.PI],
  };
  (g as THREE.Group & { userData: { parts: RoosterParts } }).userData.parts = userData;
  return g as THREE.Group & { userData: { parts: RoosterParts } };
}
