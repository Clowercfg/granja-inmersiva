import * as THREE from "three";

export interface CowParts {
  body: THREE.Mesh;
  head: THREE.Group;
  tail: THREE.Group;
  legs: THREE.Group[];
  phaseOffset: number[];
}

export function buildCow(): THREE.Group & { userData: { parts: CowParts } } {
  const g = new THREE.Group();

  const coat = new THREE.MeshStandardMaterial({ color: "#e9e1cf", roughness: 0.85 });
  const dark = new THREE.MeshStandardMaterial({ color: "#4c3a2b", roughness: 0.9 });
  const pink = new THREE.MeshStandardMaterial({ color: "#e8a790", roughness: 0.75 });

  const body = new THREE.Mesh(new THREE.CapsuleGeometry(0.4, 0.9, 4, 12), coat);
  body.rotation.x = Math.PI / 2;
  body.position.set(0, 0.62, 0);
  g.add(body);

  const patch = new THREE.Mesh(new THREE.SphereGeometry(0.26, 12, 9), dark);
  patch.scale.set(1.5, 0.75, 0.95);
  patch.position.set(-0.3, 0.74, -0.35);
  g.add(patch);

  const patch2 = new THREE.Mesh(new THREE.SphereGeometry(0.2, 12, 9), dark);
  patch2.scale.set(1.3, 0.7, 0.8);
  patch2.position.set(0.34, 0.68, 0.32);
  g.add(patch2);

  const neck = new THREE.Mesh(new THREE.BoxGeometry(0.28, 0.42, 0.4), coat);
  neck.position.set(0, 0.62, 0.62);
  neck.rotation.x = 0.4;
  g.add(neck);

  const head = new THREE.Group();
  head.position.set(0, 0.7, 0.82);
  const skull = new THREE.Mesh(new THREE.BoxGeometry(0.26, 0.28, 0.42), coat);
  skull.position.set(0, 0.02, 0.05);
  head.add(skull);
  const muzzle = new THREE.Mesh(new THREE.SphereGeometry(0.11, 10, 8), pink);
  muzzle.position.set(0, 0.0, 0.26);
  muzzle.scale.set(1, 0.8, 1.15);
  head.add(muzzle);
  const eyeMat = new THREE.MeshStandardMaterial({ color: "#1c1812", roughness: 0.3 });
  const eyeL = new THREE.Mesh(new THREE.SphereGeometry(0.032, 8, 6), eyeMat);
  eyeL.position.set(-0.1, 0.1, 0.12);
  const eyeR = new THREE.Mesh(new THREE.SphereGeometry(0.032, 8, 6), eyeMat);
  eyeR.position.set(0.1, 0.1, 0.12);
  head.add(eyeL, eyeR);
  const earL = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.11, 0.03), coat);
  earL.position.set(-0.16, 0.16, 0.1);
  earL.rotation.z = 0.5;
  const earR = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.11, 0.03), coat);
  earR.position.set(0.16, 0.16, 0.1);
  earR.rotation.z = -0.5;
  head.add(earL, earR);
  g.add(head);

  const legs: THREE.Group[] = [];
  const legPositions: Array<[number, number, number]> = [
    [-0.3, 0.56, 0.42],
    [0.3, 0.56, 0.42],
    [-0.3, 0.56, -0.42],
    [0.3, 0.56, -0.42],
  ];
  legPositions.forEach(([x, y, z]) => {
    const leg = new THREE.Group();
    leg.position.set(x, y, z);
    const mesh = new THREE.Mesh(new THREE.BoxGeometry(0.11, 0.5, 0.11), coat);
    mesh.position.set(0, -0.28, 0);
    const hoof = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.08, 0.12), dark);
    hoof.position.set(0, -0.5, 0);
    leg.add(mesh, hoof);
    g.add(leg);
    legs.push(leg);
  });

  const tail = new THREE.Group();
  tail.position.set(0, 0.75, -0.82);
  const t1 = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.06, 0.22), coat);
  t1.position.set(0, -0.02, -0.1);
  const t2 = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.05, 0.18), dark);
  t2.position.set(0, -0.06, -0.27);
  tail.add(t1, t2);
  g.add(tail);

  const udder = new THREE.Mesh(new THREE.SphereGeometry(0.16, 12, 8), pink);
  udder.scale.set(1, 0.7, 1);
  udder.position.set(0, 0.24, 0.06);
  g.add(udder);

  const userData: CowParts = {
    body,
    head,
    tail,
    legs,
    phaseOffset: [0, Math.PI, Math.PI, 0],
  };
  (g as THREE.Group & { userData: { parts: CowParts } }).userData.parts = userData;
  return g as THREE.Group & { userData: { parts: CowParts } };
}
