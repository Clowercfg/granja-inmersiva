import { useMemo, useRef } from "react";
import * as THREE from "three";
import { useFrame } from "@react-three/fiber";
import { getVegetation, type VegetationInstance } from "./vegetationData";
import { useRendererMode } from "../../core/renderer/useRendererMode";
import { useAsset } from "../../core/assets/useAsset";
import { geometryFromObject, ensureWhiteVertexColors } from "../../core/assets/assetStore";

const FLOWER_VARIANTS = ["flower:red", "flower:yellow", "flower:purple"] as const;

function variantIndex(phase: number): number {
  return Math.floor(phase * FLOWER_VARIANTS.length) % FLOWER_VARIANTS.length;
}

function buildFlowerFallback(): THREE.BufferGeometry {
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

function FlowerGroup({ assetKey, instances }: { assetKey: string; instances: VegetationInstance[] }) {
  const mode = useRendererMode();
  const asset = useAsset(assetKey);

  const geo = useMemo(() => {
    if (asset.status === "loaded" && asset.object) {
      const loaded = geometryFromObject(asset.object);
      if (loaded) return ensureWhiteVertexColors(loaded);
    }
    return buildFlowerFallback();
  }, [asset]);

  const mesh = useMemo(() => {
    const mat = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.9 });
    const m = new THREE.InstancedMesh(geo, mat, instances.length);
    m.castShadow = false;
    m.frustumCulled = false;

    const matrix = new THREE.Matrix4();
    const q = new THREE.Quaternion();
    const euler = new THREE.Euler();
    const s = new THREE.Vector3();
    const col = new THREE.Color();
    const colors = new Float32Array(instances.length * 3);
    const phases = new Float32Array(instances.length);

    instances.forEach((f, i) => {
      euler.set(0, f.yaw, 0);
      q.setFromEuler(euler);
      s.set(f.scale, f.scale * 1.1, f.scale);
      matrix.compose(new THREE.Vector3(f.x, f.y, f.z), q, s);
      m.setMatrixAt(i, matrix);
      col.setHSL(0.04 + f.phase * 0.05, 0.08, 0.9 + f.phase * 0.1);
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
        mat.userData.uniforms = shader.uniforms;
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
      mat.customProgramCacheKey = () => "flower-sway";
    }
    return m;
  }, [geo, instances, mode]);

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

export function Flowers() {
  const flowers = useMemo(() => getVegetation().flowers, []);
  const groups = useMemo(() => {
    const byVariant: VegetationInstance[][] = FLOWER_VARIANTS.map(() => []);
    for (const f of flowers) byVariant[variantIndex(f.phase)].push(f);
    return byVariant;
  }, [flowers]);

  return (
    <group>
      {FLOWER_VARIANTS.map((key, i) =>
        groups[i].length > 0 ? <FlowerGroup key={key} assetKey={key} instances={groups[i]} /> : null
      )}
    </group>
  );
}
