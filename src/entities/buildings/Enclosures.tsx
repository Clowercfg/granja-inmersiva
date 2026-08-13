import { useMemo } from "react";
import * as THREE from "three";
import { RigidBody, CuboidCollider } from "@react-three/rapier";
import { ENCLOSURES, getEnclosureFences, getGatePositions } from "../../config/enclosures";
import { buildPenRail, buildFenceGate } from "./buildingFactory";
import { terrainHeight } from "../../utils/terrain";
import { useSelectionStore } from "../../store/selectionStore";
import { useAsset } from "../../core/assets/useAsset";
import { cloneAsset, geometryFromObject, ensureWhiteVertexColors } from "../../core/assets/assetStore";

/** Desplazamiento en Z local del cuerpo de la cerca Kenney para centrarla en la línea del perímetro. */
const FENCE_BODY_Z = 0.558;
/** La puerta real mide 1.2 de ancho; se estira al hueco de 4 unidades (GATE_HALF * 2). */
const GATE_SCALE = 4 / 1.2;

export function Enclosures() {
  const railAsset = useAsset("pen-rail");
  const gateAsset = useAsset("fence-gate");

  const fences = useMemo(
    () =>
      ENCLOSURES.flatMap((def) =>
        getEnclosureFences(def).map((f) => ({
          x: f.x,
          z: f.z,
          rot: f.rot,
          y: terrainHeight(f.x, f.z),
        }))
      ),
    []
  );

  const gates = useMemo(
    () =>
      ENCLOSURES.flatMap((def) =>
        getGatePositions(def).map((g) => ({ x: g.x, z: g.z, rot: g.rot, y: terrainHeight(g.x, g.z) }))
      ),
    []
  );

  const fenceGeo = useMemo(() => {
    if (railAsset.status === "loaded" && railAsset.object) {
      const geo = geometryFromObject(railAsset.object);
      if (geo) return ensureWhiteVertexColors(geo);
    }
    return null;
  }, [railAsset]);

  const fenceMesh = useMemo(() => {
    if (!fenceGeo) return null;
    const mat = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.9, metalness: 0 });
    const m = new THREE.InstancedMesh(fenceGeo, mat, fences.length);
    m.castShadow = true;
    m.receiveShadow = true;
    m.frustumCulled = false;

    const matrix = new THREE.Matrix4();
    const q = new THREE.Quaternion();
    const euler = new THREE.Euler();
    fences.forEach((f, i) => {
      euler.set(0, f.rot, 0);
      q.setFromEuler(euler);
      const ox = Math.sin(f.rot) * FENCE_BODY_Z;
      const oz = Math.cos(f.rot) * FENCE_BODY_Z;
      matrix.compose(new THREE.Vector3(f.x + ox, f.y, f.z + oz), q, new THREE.Vector3(1, 1, 1));
      m.setMatrixAt(i, matrix);
    });
    m.instanceMatrix.needsUpdate = true;
    return m;
  }, [fenceGeo, fences]);

  const gateObjects = useMemo(
    () => gates.map(() => cloneAsset(gateAsset, [GATE_SCALE, 1, 1]) ?? buildFenceGate()),
    [gates, gateAsset]
  );

  const fallbackRails = useMemo(() => fences.map(() => buildPenRail(1.2)), [fences]);

  const patches = useMemo(
    () =>
      ENCLOSURES.map((def) => {
        const cx = (def.bounds.minX + def.bounds.maxX) / 2;
        const cz = (def.bounds.minZ + def.bounds.maxZ) / 2;
        return { def, x: cx, z: cz, y: terrainHeight(cx, cz) + 0.03 };
      }),
    []
  );

  return (
    <group>
      {patches.map(({ def, x, z, y }) => {
        const w = def.bounds.maxX - def.bounds.minX;
        const d = def.bounds.maxZ - def.bounds.minZ;
        return (
          <mesh
            key={`patch-${def.id}`}
            position={[x, y, z]}
            rotation={[-Math.PI / 2, 0, 0]}
            receiveShadow
            onClick={(e: { stopPropagation: () => void }) => {
              e.stopPropagation();
              useSelectionStore.getState().select(null);
            }}
          >
            <planeGeometry args={[w - 0.6, d - 0.6]} />
            <meshStandardMaterial color="#6f9a5a" roughness={1} />
          </mesh>
        );
      })}

      {fenceMesh ? (
        <primitive object={fenceMesh} dispose={null} />
      ) : (
        fences.map((f, i) => (
          <group
            key={`rail-fallback-${i}`}
            position={[f.x + Math.sin(f.rot) * FENCE_BODY_Z, f.y, f.z + Math.cos(f.rot) * FENCE_BODY_Z]}
            rotation={[0, f.rot, 0]}
          >
            <primitive object={fallbackRails[i]} />
          </group>
        ))
      )}

      {gates.map(({ x, z, rot, y }, i) => (
        <group
          key={`gate-${i}`}
          position={[x + Math.sin(rot) * FENCE_BODY_Z, y, z + Math.cos(rot) * FENCE_BODY_Z]}
          rotation={[0, rot, 0]}
        >
          <primitive object={gateObjects[i]} />
        </group>
      ))}

      {ENCLOSURES.map((def) => {
        const b = def.bounds;
        const cx = (b.minX + b.maxX) / 2;
        const cz = (b.minZ + b.maxZ) / 2;
        const halfW = (b.maxX - b.minX) / 2;
        const halfD = (b.maxZ - b.minZ) / 2;
        const y = terrainHeight(cx, cz) + 0.75;
        const walls = [
          { pos: [cx, y, b.minZ] as const, half: [halfW, 0.7, 0.15] as const },
          { pos: [cx, y, b.maxZ] as const, half: [halfW, 0.7, 0.15] as const },
          { pos: [b.minX, y, cz] as const, half: [0.15, 0.7, halfD] as const },
          { pos: [b.maxX, y, cz] as const, half: [0.15, 0.7, halfD] as const },
        ];
        return walls.map((w, i) => (
          <RigidBody
            key={`wall-${def.id}-${i}`}
            type="fixed"
            colliders={false}
            position={[w.pos[0], w.pos[1], w.pos[2]]}
            friction={0.5}
          >
            <CuboidCollider args={[w.half[0], w.half[1], w.half[2]]} />
          </RigidBody>
        ));
      })}
    </group>
  );
}
