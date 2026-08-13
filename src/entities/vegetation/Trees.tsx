import { useLayoutEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import { useFrame } from "@react-three/fiber";
import { buildTreeGeometry } from "./treeGeometry";
import { getVegetation, type VegetationInstance } from "./vegetationData";
import { useRendererMode } from "../../core/renderer/useRendererMode";
import { useAsset } from "../../core/assets/useAsset";
import { geometryFromObject, ensureWhiteVertexColors } from "../../core/assets/assetStore";

const TREE_VARIANTS = ["tree:default", "tree:cone", "tree:plateau", "tree:q1", "tree:q2", "tree:q3"] as const;

function variantIndex(phase: number): number {
  return Math.floor(phase * TREE_VARIANTS.length) % TREE_VARIANTS.length;
}

function TreeGroup({ assetKey, instances }: { assetKey: string; instances: VegetationInstance[] }) {
  const mode = useRendererMode();
  const asset = useAsset(assetKey);

  const treeGeo = useMemo(() => {
    if (asset.status === "loaded" && asset.object) {
      const geo = geometryFromObject(asset.object);
      if (geo) return ensureWhiteVertexColors(geo);
    }
    return buildTreeGeometry();
  }, [asset]);

  const instanced = useMemo(() => {
    const mat = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.95, metalness: 0 });
    const mesh = new THREE.InstancedMesh(treeGeo, mat, instances.length);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    mesh.frustumCulled = false;

    const m = new THREE.Matrix4();
    const q = new THREE.Quaternion();
    const euler = new THREE.Euler();
    const scale = new THREE.Vector3();
    const col = new THREE.Color();
    const colors = new Float32Array(instances.length * 3);
    const phases = new Float32Array(instances.length);

    instances.forEach((t, i) => {
      euler.set(0, t.yaw, 0);
      q.setFromEuler(euler);
      scale.set(t.scale, t.scale * (0.9 + t.phase * 0.25), t.scale);
      m.compose(new THREE.Vector3(t.x, t.y, t.z), q, scale);
      mesh.setMatrixAt(i, m);
      col.setHSL(0.1 + t.phase * 0.05, 0.07, 0.88 + t.phase * 0.12);
      colors[i * 3] = col.r;
      colors[i * 3 + 1] = col.g;
      colors[i * 3 + 2] = col.b;
      phases[i] = t.phase;
    });

    mesh.instanceMatrix.needsUpdate = true;
    mesh.instanceColor = new THREE.InstancedBufferAttribute(colors, 3);
    mesh.geometry.setAttribute("aPhase", new THREE.InstancedBufferAttribute(phases, 1));

    if (mode === "webgl") injectSway(mat);
    return mesh;
  }, [treeGeo, instances, mode]);

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

export function Trees() {
  const trees = useMemo(() => getVegetation().trees, []);
  const groups = useMemo(() => {
    const byVariant: VegetationInstance[][] = TREE_VARIANTS.map(() => []);
    for (const t of trees) byVariant[variantIndex(t.phase)].push(t);
    return byVariant;
  }, [trees]);

  return (
    <group>
      {TREE_VARIANTS.map((key, i) =>
        groups[i].length > 0 ? <TreeGroup key={key} assetKey={key} instances={groups[i]} /> : null
      )}
    </group>
  );
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
