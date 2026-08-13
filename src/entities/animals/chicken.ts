import * as THREE from "three";

export interface ChickenParts {
  body: THREE.Mesh;
  head: THREE.Group;
  wings: THREE.Mesh[];
  legs: THREE.Group[];
  tail: THREE.Group;
  phaseOffset: number[];
}

export function buildChicken(): THREE.Group & { userData: { parts: ChickenParts } } {
  const g = new THREE.Group();

  const feather = new THREE.MeshStandardMaterial({ color: "#e6dcc3", roughness: 0.9 });
  const featherDark = new THREE.MeshStandardMaterial({ color: "#b98a4e", roughness: 0.9 });
  const comb = new THREE.MeshStandardMaterial({ color: "#d63f2e", roughness: 0.6 });
  const beakMat = new THREE.MeshStandardMaterial({ color: "#e8a33d", roughness: 0.7 });
  const legMat = new THREE.MeshStandardMaterial({ color: "#d99a3d", roughness: 0.8 });

  const body = new THREE.Mesh(new THREE.SphereGeometry(0.34, 14, 10), feather);
  body.scale.set(1, 0.85, 1.15);
  body.position.set(0, 0.42, 0);
  g.add(body);

  const chest = new THREE.Mesh(new THREE.SphereGeometry(0.26, 12, 9), featherDark);
  chest.scale.set(0.8, 1, 1.1);
  chest.position.set(0, 0.36, 0.28);
  g.add(chest);

  const head = new THREE.Group();
  head.position.set(0, 0.72, 0.28);
  const skull = new THREE.Mesh(new THREE.SphereGeometry(0.15, 10, 8), feather);
  skull.scale.set(1, 1.1, 1);
  head.add(skull);
  const beak = new THREE.Mesh(new THREE.ConeGeometry(0.045, 0.14, 6), beakMat);
  beak.rotation.x = Math.PI / 2;
  beak.position.set(0, 0.0, 0.18);
  head.add(beak);
  const combTop = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.07, 0.04), comb);
  combTop.position.set(0, 0.16, 0.04);
  combTop.rotation.x = 0.3;
  head.add(combTop);
  const wattle = new THREE.Mesh(new THREE.SphereGeometry(0.028, 6, 5), comb);
  wattle.position.set(0, -0.05, 0.13);
  head.add(wattle);
  const eyeMat = new THREE.MeshStandardMaterial({ color: "#1a1512", roughness: 0.3 });
  const eyeL = new THREE.Mesh(new THREE.SphereGeometry(0.024, 6, 5), eyeMat);
  eyeL.position.set(-0.11, 0.05, 0.12);
  const eyeR = new THREE.Mesh(new THREE.SphereGeometry(0.024, 6, 5), eyeMat);
  eyeR.position.set(0.11, 0.05, 0.12);
  head.add(eyeL, eyeR);
  g.add(head);

  const wings: THREE.Mesh[] = [];
  for (const sx of [-1, 1]) {
    const wing = new THREE.Mesh(new THREE.SphereGeometry(0.18, 10, 8), feather);
    wing.scale.set(0.4, 1, 1.5);
    wing.position.set(sx * 0.34, 0.44, -0.02);
    wing.rotation.y = sx * 0.35;
    g.add(wing);
    wings.push(wing);
  }

  const legs: THREE.Group[] = [];
  for (const sx of [-1, 1]) {
    const leg = new THREE.Group();
    leg.position.set(sx * 0.13, 0.14, 0);
    const shank = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.025, 0.28, 6), legMat);
    shank.position.set(0, -0.14, 0);
    leg.add(shank);
    g.add(leg);
    legs.push(leg);
  }

  const tail = new THREE.Group();
  tail.position.set(0, 0.5, -0.36);
  for (let i = 0; i < 3; i++) {
    const f = new THREE.Mesh(new THREE.ConeGeometry(0.05, 0.28, 5), i % 2 ? feather : featherDark);
    f.rotation.x = -0.6;
    f.position.set((i - 1) * 0.09, 0.04, -0.14);
    f.rotation.z = (i - 1) * 0.3;
    tail.add(f);
  }
  g.add(tail);

  const userData: ChickenParts = {
    body,
    head,
    wings,
    legs,
    tail,
    phaseOffset: [0, Math.PI],
  };
  (g as THREE.Group & { userData: { parts: ChickenParts } }).userData.parts = userData;
  return g as THREE.Group & { userData: { parts: ChickenParts } };
}
