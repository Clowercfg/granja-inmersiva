import { useMemo, useRef } from "react";
import * as THREE from "three";
import { useFrame } from "@react-three/fiber";
import { getVegetation } from "./vegetationData";
import { useRendererMode } from "../../core/renderer/useRendererMode";

function buildFlowerGeometry(): THREE.BufferGeometry {
  const stem = new THREE.CylinderGeometry(0.02, 0.03, 0.45, 5);
  stem.translate(0, 0.22, 0);
  const head = new THREE.IcosahedronGeometry(0.09, 0);
  head.scale(1.1, 0.9, 1.1);
  head.translate(0, 0.52, 0);

  const stemCount = stem.attributes.position.count;
  const headCount = head.attributes.position.count;
  const colors = new Float32Array((stemCount + headCount) * 3);
  for (let i = 0; i < stemCount; i++) {
    colors[i * 3] = 0.25;
    colors[i * 3 + 1] = 0.55;
    colors[i * 3 + 2] = 0.22;
  }
  const h0 = stemCount * 3;
  for (let i = 0; i < headCount; i++) {
    const v = i / headCount;
    colors[h0 + i * 3] = 1.0;
    colors[h0 + i * 3 + 1] = 0.4 + v * 0.5;
    colors[h0 + i * 3 + 2] = 0.5;
  }

  const geo = new THREE.BufferGeometry();
  const positions = new Float32Array((stemCount + headCount) * 3);
  positions.set(stem.attributes.position.array as Float32Array, 0);
  positions.set(head.attributes.position.array as Float32Array, stemCount * 3);
  geo.setAttribute("position", new THREE.BufferAttribute(positions, 3));
  geo.setAttribute("color", new THREE.BufferAttribute(colors, 3));
  geo.computeVertexNormals();
  return geo;
}

export function Flowers() {
  const mode = useRendererMode();
  const geo = useMemo(() => buildFlowerGeometry(), []);
  const data = useMemo(() => getVegetation(), []);
  const mesh = useMemo(() => {
    const mat = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.9 });
    const m = new THREE.InstancedMesh(geo, mat, data.flowers.length);
    m.castShadow = false;
    m.frustumCulled = false;
    const matrix = new THREE.Matrix4();
    const q = new THREE.Quaternion();
    const euler = new THREE.Euler();
    const s = new THREE.Vector3();
    const col = new THREE.Color();
    const colors = new Float32Array(data.flowers.length * 3);
    const phases = new Float32Array(data.flowers.length);
    data.flowers.forEach((f, i) => {
      euler.set(0, f.yaw, 0);
      q.setFromEuler(euler);
      s.set(f.scale, f.scale * 1.1, f.scale);
      matrix.compose(new THREE.Vector3(f.x, f.y, f.z), q, s);
      m.setMatrixAt(i, matrix);
      const hue = 0.03 + f.phase * 0.1;
      const variety = f.phase;
      if (variety < 0.33) col.setHSL(hue, 0.8, 0.65);
      else if (variety < 0.66) col.setHSL(0.55 + f.phase * 0.1, 0.75, 0.6);
      else col.setHSL(0.93 + f.phase * 0.03, 0.7, 0.68);
      colors[i * 3] = col.r;
      colors[i * 3 + 1] = col.g;
      colors[i * 3 + 2] = col.b;
      phases[i] = f.phase;
    });
    m.instanceMatrix.needsUpdate = true;
    m.instanceColor = new THREE.InstancedBufferAttribute(colors, 3);
    m.geometry.setAttribute("aPhase", new THREE.InstancedBufferAttribute(phases, 1));
    if (mode === "webgl") {
      mat.onBeforeCompile = (shader) => {
        shader.uniforms.uTime = { value: 0 };
        shader.vertexShader =
          "attribute float aPhase;\nuniform float uTime;\n" +
          shader.vertexShader.replace(
            "#include <begin_vertex>",
            `#include <begin_vertex>
            float swa = sin(uTime * 1.4 + aPhase * 6.28318);
            float swb = cos(uTime * 1.1 + aPhase * 6.28318);
            float k = smoothstep(0.0, 1.0, position.y / 0.55);
            transformed.x += swa * 0.03 * k;
            transformed.z += swb * 0.025 * k;
            `
          );
      };
    }
    return m;
  }, [geo, data, mode]);

  const ref = useRef<THREE.InstancedMesh>(null);

  useFrame((state) => {
    const inst = ref.current;
    if (!inst) return;
    const mat = inst.material as THREE.MeshStandardMaterial & { userData?: { uTime?: { value: number } } };
    const u = mat.userData?.uTime;
    if (u) u.value = state.clock.elapsedTime;
  });

  return <primitive object={mesh} ref={ref} dispose={null} />;
}
