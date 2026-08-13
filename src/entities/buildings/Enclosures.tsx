import { useMemo } from "react";
import * as THREE from "three";
import { RigidBody, CuboidCollider } from "@react-three/rapier";
import { ENCLOSURES, getEnclosureFences, getGatePositions } from "../../config/enclosures";
import { buildPenRail, buildFenceGate } from "./buildingFactory";
import { terrainHeight } from "../../utils/terrain";
import { useSelectionStore } from "../../store/selectionStore";
import { useAsset } from "../../core/assets/useAsset";
import { cloneAsset } from "../../core/assets/assetStore";

const RAIL_LENGTH = 6;
/** Largo de diseño del modelo pen-rail.glb; se escala en X al largo del tramo. */
const PEN_RAIL_DESIGN_LENGTH = 6;

export function Enclosures() {
  const railAsset = useAsset("pen-rail");
  const gateAsset = useAsset("fence-gate");

  const fences = useMemo(
    () =>
      ENCLOSURES.flatMap((def) =>
        getEnclosureFences(def).map((f) => ({
          def,
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
        getGatePositions(def).map((g) => ({ def, x: g.x, z: g.z, rot: g.rot, y: terrainHeight(g.x, g.z) }))
      ),
    []
  );

  const railObjects = useMemo(
    () => fences.map(() => cloneAsset(railAsset, [RAIL_LENGTH / PEN_RAIL_DESIGN_LENGTH, 1, 1]) ?? buildPenRail(RAIL_LENGTH)),
    [fences, railAsset]
  );

  const gateObjects = useMemo(
    () => gates.map(() => cloneAsset(gateAsset) ?? buildFenceGate()),
    [gates, gateAsset]
  );

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

      {fences.map(({ def, x, z, rot, y }, i) => (
        <group key={`rail-${def.id}-${i}`} position={[x, y, z]} rotation={[0, rot, 0]}>
          <primitive object={railObjects[i]} />
        </group>
      ))}

      {gates.map(({ def, x, z, rot, y }, i) => (
        <group key={`gate-${def.id}-${i}`} position={[x, y, z]} rotation={[0, rot, 0]}>
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
