import { useMemo, useRef } from "react";
import * as THREE from "three";
import { getVegetation, type VegetationInstance } from "./vegetationData";
import { useAsset } from "../../core/assets/useAsset";
import { geometryFromObject, ensureWhiteVertexColors } from "../../core/assets/assetStore";

const BUSH_VARIANTS = ["bush:kenney", "bush:kenneyLarge", "bush:kenneySmall", "bush:q1", "bush:q2"] as const;

function variantIndex(phase: number): number {
  return Math.floor(phase * BUSH_VARIANTS.length) % BUSH_VARIANTS.length;
}

function buildBushFallback(): THREE.BufferGeometry {
  const g = new THREE.IcosahedronGeometry(0.45, 1);
  g.scale(1, 0.75, 1);
  const pos = g.attributes.position;
  const colors = new Float32Array(pos.count * 3);
  for (let i = 0; i < pos.count; i++) {
    const t = i / pos.count;
    colors[i * 3] = 0.22 + t * 0.12;
    colors[i * 3 + 1] = 0.45 + t * 0.2;
    colors[i * 3 + 2] = 0.2 + t * 0.1;
  }
  g.setAttribute("color", new THREE.BufferAttribute(colors, 3));
  return g;
}

function BushGroup({ assetKey, instances }: { assetKey: string; instances: VegetationInstance[] }) {
  const asset = useAsset(assetKey);

  const geo = useMemo(() => {
    if (asset.status === "loaded" && asset.object) {
      const loaded = geometryFromObject(asset.object);
      if (loaded) return ensureWhiteVertexColors(loaded);
    }
    return buildBushFallback();
  }, [asset]);

  const mesh = useMemo(() => {
    const mat = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 1, metalness: 0 });
    const m = new THREE.InstancedMesh(geo, mat, instances.length);
    m.castShadow = true;
    m.receiveShadow = true;
    m.frustumCulled = false;

    const matrix = new THREE.Matrix4();
    const q = new THREE.Quaternion();
    const euler = new THREE.Euler();
    const s = new THREE.Vector3();
    const col = new THREE.Color();
    const colors = new Float32Array(instances.length * 3);

    instances.forEach((b, i) => {
      euler.set(0, b.yaw, 0);
      q.setFromEuler(euler);
      s.set(b.scale, b.scale * (0.8 + b.phase * 0.4), b.scale);
      matrix.compose(new THREE.Vector3(b.x, b.y, b.z), q, s);
      m.setMatrixAt(i, matrix);
      col.setHSL(0.22 + b.phase * 0.05, 0.14, 0.6 + b.phase * 0.2);
      colors[i * 3] = col.r;
      colors[i * 3 + 1] = col.g;
      colors[i * 3 + 2] = col.b;
    });

    m.instanceMatrix.needsUpdate = true;
    m.instanceColor = new THREE.InstancedBufferAttribute(colors, 3);
    return m;
  }, [geo, instances]);

  const ref = useRef<THREE.InstancedMesh>(null);
  return <primitive object={mesh} ref={ref} dispose={null} />;
}

export function Bushes() {
  const bushes = useMemo(() => getVegetation().bushes, []);
  const groups = useMemo(() => {
    const byVariant: VegetationInstance[][] = BUSH_VARIANTS.map(() => []);
    for (const b of bushes) byVariant[variantIndex(b.phase)].push(b);
    return byVariant;
  }, [bushes]);

  return (
    <group>
      {BUSH_VARIANTS.map((key, i) =>
        groups[i].length > 0 ? <BushGroup key={key} assetKey={key} instances={groups[i]} /> : null
      )}
    </group>
  );
}
