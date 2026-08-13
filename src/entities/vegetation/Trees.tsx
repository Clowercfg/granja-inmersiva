import { useLayoutEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import { useFrame } from "@react-three/fiber";
import { buildTreeGeometry } from "./treeGeometry";
import { getVegetation } from "./vegetationData";
import { useRendererMode } from "../../core/renderer/useRendererMode";

export function Trees() {
  const mode = useRendererMode();
  const treeGeo = useMemo(() => buildTreeGeometry(), []);

  const instanced = useMemo(() => {
    const data = getVegetation().trees;
    const mesh = new THREE.InstancedMesh(treeGeo, new THREE.MeshStandardMaterial(), data.length);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    mesh.frustumCulled = false;

    const m = new THREE.Matrix4();
    const q = new THREE.Quaternion();
    const euler = new THREE.Euler();
    const scale = new THREE.Vector3();
    const col = new THREE.Color();
    const colors = new Float32Array(data.length * 3);
    const phases = new Float32Array(data.length);

    data.forEach((t, i) => {
      euler.set(0, t.yaw, 0);
      q.setFromEuler(euler);
      scale.set(t.scale, t.scale * (0.9 + t.phase * 0.25), t.scale);
      m.compose(new THREE.Vector3(t.x, t.y, t.z), q, scale);
      mesh.setMatrixAt(i, m);
      col.setHSL(0.24 + t.phase * 0.05, 0.35 + t.phase * 0.2, 0.28 + t.phase * 0.12);
      colors[i * 3] = col.r;
      colors[i * 3 + 1] = col.g;
      colors[i * 3 + 2] = col.b;
      phases[i] = t.phase;
    });

    mesh.instanceMatrix.needsUpdate = true;
    const instCol = new THREE.InstancedBufferAttribute(colors, 3);
    mesh.instanceColor = instCol;
    const ph = new THREE.InstancedBufferAttribute(phases, 1);
    mesh.geometry.setAttribute("aPhase", ph);

    const mat = mesh.material as THREE.MeshStandardMaterial;
    mat.vertexColors = true;
    mat.roughness = 0.95;
    mat.metalness = 0;
    if (mode === "webgl") injectSway(mat);
    return mesh;
  }, [treeGeo, mode]);

  const ref = useRef<THREE.InstancedMesh>(null);

  useLayoutEffect(() => {
    const mesh = ref.current;
    if (!mesh) return;
    mesh.instanceColor!.needsUpdate = true;
    mesh.instanceMatrix.needsUpdate = true;
  }, [instanced]);

  useFrame((state) => {
    const mat = ref.current?.material as THREE.MeshStandardMaterial;
    if (mat && mat.userData.uniforms?.uTime) {
      mat.userData.uniforms.uTime.value = state.clock.elapsedTime;
    }
  });

  return <primitive object={instanced} ref={ref} dispose={null} />;
}

function injectSway(mat: THREE.MeshStandardMaterial): void {
  mat.onBeforeCompile = (shader) => {
    shader.uniforms.uTime = { value: 0 };
    mat.userData.uniforms = shader.uniforms;
    shader.vertexShader =
      "attribute float aPhase;\nuniform float uTime;\n" +
      shader.vertexShader.replace(
        "#include <begin_vertex>",
        `#include <begin_vertex>
        float swv = sin(uTime * 1.15 + aPhase * 6.28318);
        float swz = cos(uTime * 0.95 + aPhase * 6.28318);
        float windK = smoothstep(0.35, 1.0, position.y / 3.8);
        transformed.x += swv * 0.07 * windK;
        transformed.z += swz * 0.055 * windK;
        `
      );
  };
  mat.customProgramCacheKey = () => "tree-sway";
}
