import { useMemo, useRef } from "react";
import * as THREE from "three";
import { getVegetation } from "./vegetationData";

export function Rocks() {
  const geo = useMemo(() => {
    const g = new THREE.DodecahedronGeometry(0.5, 0);
    const pos = g.attributes.position;
    const colors = new Float32Array(pos.count * 3);
    for (let i = 0; i < pos.count; i++) {
      const t = i / pos.count;
      colors[i * 3] = 0.55 + t * 0.25;
      colors[i * 3 + 1] = 0.53 + t * 0.22;
      colors[i * 3 + 2] = 0.5 + t * 0.18;
    }
    g.setAttribute("color", new THREE.BufferAttribute(colors, 3));
    return g;
  }, []);

  const data = useMemo(() => getVegetation(), []);
  const mesh = useMemo(() => {
    const mat = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 1, metalness: 0 });
    const m = new THREE.InstancedMesh(geo, mat, data.rocks.length);
    m.castShadow = true;
    m.receiveShadow = true;
    m.frustumCulled = false;
    const matrix = new THREE.Matrix4();
    const q = new THREE.Quaternion();
    const euler = new THREE.Euler();
    const s = new THREE.Vector3();
    const col = new THREE.Color();
    const colors = new Float32Array(data.rocks.length * 3);
    data.rocks.forEach((r, i) => {
      euler.set(r.phase * Math.PI, r.yaw, r.phase * Math.PI * 0.5);
      q.setFromEuler(euler);
      s.set(r.scale, r.scale * (0.55 + r.phase * 0.4), r.scale);
      matrix.compose(new THREE.Vector3(r.x, r.y, r.z), q, s);
      m.setMatrixAt(i, matrix);
      col.setHSL(0.08, 0.05, 0.32 + r.phase * 0.16);
      colors[i * 3] = col.r;
      colors[i * 3 + 1] = col.g;
      colors[i * 3 + 2] = col.b;
    });
    m.instanceMatrix.needsUpdate = true;
    m.instanceColor = new THREE.InstancedBufferAttribute(colors, 3);
    return m;
  }, [geo, data]);

  const ref = useRef<THREE.InstancedMesh>(null);
  return <primitive object={mesh} ref={ref} dispose={null} />;
}
