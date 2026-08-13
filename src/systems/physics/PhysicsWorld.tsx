import { useMemo } from "react";
import * as THREE from "three";
import { Physics, RigidBody, TrimeshCollider, CuboidCollider, CylinderCollider } from "@react-three/rapier";
import { terrainHeight } from "../../utils/terrain";
import { WORLD } from "../../config/world";
import { STATIC_BUILDINGS } from "../../config/layout";
import type { BuildingType } from "../../config/world";
import { getTreeColliders } from "../../entities/vegetation/vegetationData";
import { Enclosures } from "../../entities/buildings/Enclosures";

function buildTerrainTrimesh(): { vertices: Float32Array; indices: Uint32Array } {
  const step = 12;
  const n = Math.floor((WORLD.size) / step) + 1;
  const vertices = new Float32Array(n * n * 3);
  const positions: THREE.Vector3[] = [];
  for (let iz = 0; iz < n; iz++) {
    for (let ix = 0; ix < n; ix++) {
      const x = -WORLD.half + ix * step;
      const z = -WORLD.half + iz * step;
      positions.push(new THREE.Vector3(x, terrainHeight(x, z), z));
    }
  }
  positions.forEach((p, i) => {
    vertices[i * 3] = p.x;
    vertices[i * 3 + 1] = p.y;
    vertices[i * 3 + 2] = p.z;
  });
  const indices = new Uint32Array((n - 1) * (n - 1) * 6);
  let idx = 0;
  for (let iz = 0; iz < n - 1; iz++) {
    for (let ix = 0; ix < n - 1; ix++) {
      const a = iz * n + ix;
      const b = iz * n + ix + 1;
      const c = (iz + 1) * n + ix;
      const d = (iz + 1) * n + ix + 1;
      indices[idx++] = a;
      indices[idx++] = b;
      indices[idx++] = c;
      indices[idx++] = b;
      indices[idx++] = d;
      indices[idx++] = c;
    }
  }
  return { vertices, indices };
}

const BUILDING_HEIGHT: Record<BuildingType, number> = {
  barn: 7,
  house: 5,
  cowPen: 1.4,
  chickenPen: 1.4,
  warehouse: 5.4,
  greenhouse: 3.8,
  workshop: 3.5,
};

interface PhysBuilding {
  uid: string;
  type: BuildingType;
  position: [number, number, number];
  rotation: number;
}

export function PhysicsWorld() {
  const terrain = useMemo(buildTerrainTrimesh, []);

  const buildings = useMemo<PhysBuilding[]>(() => [...STATIC_BUILDINGS], []);

  const treeColliders = useMemo(
    () => getTreeColliders().filter((t) => Math.hypot(t.x, t.z) < 200),
    []
  );

  return (
    <Physics gravity={[0, -9.81, 0]}>
      <RigidBody type="fixed" colliders={false} friction={1.1}>
        <TrimeshCollider args={[terrain.vertices, terrain.indices]} />
      </RigidBody>

      {buildings.map((b) => {
        const size =
          b.type === "barn"
            ? [8, 6]
            : b.type === "house"
              ? [5.6, 4.6]
              : b.type === "warehouse"
                ? [7.2, 5.2]
                : b.type === "greenhouse"
                  ? [6.2, 4.2]
                  : b.type === "workshop"
                    ? [5.2, 4.2]
                    : [5, 3];
        const h = BUILDING_HEIGHT[b.type];
        const y = terrainHeight(b.position[0], b.position[2]) + h / 2;
        return (
          <RigidBody
            key={b.uid}
            type="fixed"
            colliders={false}
            position={[b.position[0], y, b.position[2]]}
            rotation={[0, b.rotation, 0]}
            friction={0.6}
          >
            <CuboidCollider args={[size[0], h / 2, size[1]]} />
          </RigidBody>
        );
      })}

      <Enclosures />

      {treeColliders.slice(0, 90).map((t, i) => (
        <RigidBody
          key={`tree-${i}`}
          type="fixed"
          colliders={false}
          position={[t.x, terrainHeight(t.x, t.z) + t.radius * 1.6, t.z]}
          friction={0.6}
        >
          <CylinderCollider args={[t.radius * 1.8, t.radius]} />
        </RigidBody>
      ))}
    </Physics>
  );
}
