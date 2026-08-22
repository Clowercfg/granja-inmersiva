import { useEffect, useMemo, useRef, useState } from "react";
import * as THREE from "three";
import { useFrame } from "@react-three/fiber";
import { getVegetation, type VegetationInstance } from "./vegetationData";
import { createGrassMaterial } from "../../shaders/grass";
import { atmosphere } from "../../shaders/atmosphere";
import { useRendererMode } from "../../core/renderer/useRendererMode";
import { useWorldStore } from "../../store/worldStore";
import { useWorldStore as useWS } from "../../store/worldStore";

function buildBladeGeometry(): THREE.BufferGeometry {
  const positions = new Float32Array([
    -0.05, 0, 0, 0.05, 0, 0,
    -0.028, 0.55, 0, 0.028, 0.55, 0,
    -0.006, 1, 0, 0.006, 1, 0,
  ]);
  const colors = new Float32Array([
    0.22, 0.42, 0.2, 0.26, 0.48, 0.24,
    0.32, 0.55, 0.3, 0.36, 0.6, 0.34,
    0.55, 0.72, 0.4, 0.58, 0.75, 0.43,
  ]);
  const indices = [0, 1, 2, 1, 3, 2, 2, 3, 4, 3, 5, 4];
  const geo = new THREE.BufferGeometry();
  geo.setAttribute("position", new THREE.BufferAttribute(positions, 3));
  geo.setAttribute("color", new THREE.BufferAttribute(colors, 3));
  geo.setIndex(indices);
  return geo;
}

const GRASS_BATCH_SIZE = 6000;

function buildBatchInstanced(
  data: VegetationInstance[],
  geo: THREE.BufferGeometry,
  mode: string,
  start: number,
  count: number
): THREE.InstancedMesh {
  const slice = data.slice(start, start + count);
  const mat =
    mode === "webgpu"
      ? new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 1, alphaTest: 0.4, side: THREE.DoubleSide })
      : createGrassMaterial();

  const mesh = new THREE.InstancedMesh(geo, mat, slice.length);
  mesh.frustumCulled = false;
  mesh.castShadow = false;
  mesh.receiveShadow = true;

  const m = new THREE.Matrix4();
  const q = new THREE.Quaternion();
  const euler = new THREE.Euler();
  const s = new THREE.Vector3();
  const col = new THREE.Color();
  const colors = new Float32Array(slice.length * 3);

  slice.forEach((g, i) => {
    euler.set(0, g.yaw, 0);
    q.setFromEuler(euler);
    const sc = g.scale;
    s.set(0.8 + (g.phase * 0.5), sc * (0.85 + g.phase * 0.4), 0.8 + g.phase * 0.5);
    m.compose(new THREE.Vector3(g.x, g.y, g.z), q, s);
    mesh.setMatrixAt(i, m);
    col.setHSL(0.24 + g.phase * 0.06, 0.42, 0.3 + g.phase * 0.14);
    colors[i * 3] = col.r;
    colors[i * 3 + 1] = col.g;
    colors[i * 3 + 2] = col.b;
  });

  mesh.instanceMatrix.needsUpdate = true;
  mesh.instanceColor = new THREE.InstancedBufferAttribute(colors, 3);
  return mesh;
}

function GrassBatch({ bladeGeo, data, mode, start }: { bladeGeo: THREE.BufferGeometry; data: VegetationInstance[]; mode: string; start: number }) {
  const mesh = useMemo(
    () => buildBatchInstanced(data, bladeGeo, mode, start, GRASS_BATCH_SIZE),
    [data, bladeGeo, mode, start]
  );
  const ref = useRef<THREE.InstancedMesh>(null);

  useFrame((_, delta) => {
    const inst = ref.current;
    if (!inst) return;
    const mat = inst.material;
    if ((mat as THREE.ShaderMaterial).isShaderMaterial) {
      const sm = mat as THREE.ShaderMaterial;
      sm.uniforms.uTime.value = atmosphere.uTime.value;
      sm.uniforms.uFogColor.value.copy(atmosphere.uFogColor.value);
      sm.uniforms.uFogDensity.value = atmosphere.uFogDensity.value;
      const weather = useWorldStore.getState().weather;
      sm.uniforms.uWind.value = weather === "rain" ? 1.35 : weather === "cloudy" ? 0.85 : 1.0;
    } else {
      (mat as THREE.MeshStandardMaterial).color.set(
        useWorldStore.getState().weather === "cloudy" ? "#a8c48a" : "#bfd9a0"
      );
    }
    void delta;
  });

  return <primitive object={mesh} ref={ref} dispose={null} />;
}

export function GrassField() {
  const mode = useRendererMode();
  const bladeGeo = useMemo(() => buildBladeGeometry(), []);
  const data = useMemo(() => getVegetation(), []);
  const booted = useWorldStore((s) => s.booted);
  const [visibleCount, setVisibleCount] = useState(0);

  useEffect(() => {
    if (!booted) return;
    const totalBatches = Math.ceil(data.grass.length / GRASS_BATCH_SIZE);
    let currentBatch = 0;

    const addBatch = () => {
      currentBatch++;
      setVisibleCount(Math.min(currentBatch * GRASS_BATCH_SIZE, data.grass.length));
      if (currentBatch < totalBatches) {
        setTimeout(addBatch, 50);
      }
    };

    const timer = setTimeout(addBatch, 200);
    return () => clearTimeout(timer);
  }, [booted, data.grass.length]);

  const batches = useMemo(() => {
    const result: number[] = [];
    for (let i = 0; i < visibleCount; i += GRASS_BATCH_SIZE) {
      result.push(i);
    }
    return result;
  }, [visibleCount]);

  return (
    <group>
      {batches.map((start) => (
        <GrassBatch
          key={start}
          bladeGeo={bladeGeo}
          data={data.grass}
          mode={mode}
          start={start}
        />
      ))}
    </group>
  );
}
