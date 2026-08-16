import * as THREE from "three";

export interface PigParts {
  body: THREE.Mesh;
  head: THREE.Group;
  tail: THREE.Group;
  legs: THREE.Group[];
  phaseOffset: number[];
}

export function buildPig(): THREE.Group & { userData: { parts: PigParts } } {
  const g = new THREE.Group();

  const skin = new THREE.MeshStandardMaterial({ color: "#f0b0a0", roughness: 0.8 });
  const skinDark = new THREE.MeshStandardMaterial({ color: "#c98a7a", roughness: 0.85 });
  const snoutMat = new THREE.MeshStandardMaterial({ color: "#e8957f", roughness: 0.7 });

  const body = new THREE.Mesh(new THREE.CapsuleGeometry(0.42, 0.75, 4, 12), skin);
  body.rotation.x = Math.PI / 2;
  body.scale.set(1, 0.92, 1);
  body.position.set(0, 0.5, 0);
  g.add(body);

  const head = new THREE.Group();
  head.position.set(0, 0.52, 0.72);
  const skull = new THREE.Mesh(new THREE.BoxGeometry(0.28, 0.24, 0.36), skin);
  skull.position.set(0, 0, 0);
  head.add(skull);
  const snout = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.13, 0.18, 10), snoutMat);
  snout.rotation.x = Math.PI / 2;
  snout.position.set(0, -0.04, 0.22);
  head.add(snout);
  const nostrilMat = new THREE.MeshStandardMaterial({ color: "#7a4634", roughness: 0.4 });
  const nostrilL = new THREE.Mesh(new THREE.SphereGeometry(0.022, 6, 5), nostrilMat);
  nostrilL.position.set(-0.05, -0.04, 0.32);
  const nostrilR = new THREE.Mesh(new THREE.SphereGeometry(0.022, 6, 5), nostrilMat);
  nostrilR.position.set(0.05, -0.04, 0.32);
  head.add(nostrilL, nostrilR);
  const earMat = new THREE.MeshStandardMaterial({ color: "#c98a7a", roughness: 0.8 });
  const earL = new THREE.Mesh(new THREE.SphereGeometry(0.07, 8, 6), earMat);
  earL.scale.set(1, 0.5, 0.6);
  earL.position.set(-0.16, 0.14, 0.02);
  earL.rotation.z = 0.5;
  const earR = new THREE.Mesh(new THREE.SphereGeometry(0.07, 8, 6), earMat);
  earR.scale.set(1, 0.5, 0.6);
  earR.position.set(0.16, 0.14, 0.02);
  earR.rotation.z = -0.5;
  head.add(earL, earR);
  const eyeMat = new THREE.MeshStandardMaterial({ color: "#1c1812", roughness: 0.3 });
  const eyeL = new THREE.Mesh(new THREE.SphereGeometry(0.028, 8, 6), eyeMat);
  eyeL.position.set(-0.11, 0.08, 0.1);
  const eyeR = new THREE.Mesh(new THREE.SphereGeometry(0.028, 8, 6), eyeMat);
  eyeR.position.set(0.11, 0.08, 0.1);
  head.add(eyeL, eyeR);
  g.add(head);

  const legs: THREE.Group[] = [];
  const legPositions: Array<[number, number, number]> = [
    [-0.32, 0.42, 0.44],
    [0.32, 0.42, 0.44],
    [-0.32, 0.42, -0.44],
    [0.32, 0.42, -0.44],
  ];
  legPositions.forEach(([x, y, z]) => {
    const leg = new THREE.Group();
    leg.position.set(x, y, z);
    const mesh = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.42, 0.12), skin);
    mesh.position.set(0, -0.21, 0);
    const hoof = new THREE.Mesh(new THREE.BoxGeometry(0.13, 0.07, 0.13), skinDark);
    hoof.position.set(0, -0.4, 0);
    leg.add(mesh, hoof);
    g.add(leg);
    legs.push(leg);
  });

  const tail = new THREE.Group();
  tail.position.set(0, 0.62, -0.72);
  const curl = new THREE.Mesh(new THREE.TorusGeometry(0.06, 0.018, 6, 10, Math.PI * 1.6), skin);
  curl.rotation.x = Math.PI / 2;
  curl.position.set(0, 0.05, 0);
  tail.add(curl);
  g.add(tail);

  const userData: PigParts = {
    body,
    head,
    tail,
    legs,
    phaseOffset: [0, Math.PI, Math.PI, 0],
  };
  (g as THREE.Group & { userData: { parts: PigParts } }).userData.parts = userData;
  return g as THREE.Group & { userData: { parts: PigParts } };
}
