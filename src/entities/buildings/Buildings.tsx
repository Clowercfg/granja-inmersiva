import { useMemo } from "react";
import * as THREE from "three";
import { STATIC_BUILDINGS, FENCE_SEGMENTS } from "../../config/layout";
import { buildFence } from "./buildingFactory";
import { Building } from "./Building";

export function Buildings() {
  const decorativeFences = useMemo(
    () =>
      FENCE_SEGMENTS.map(([x, z, rot]) => {
        const g = new THREE.Group();
        g.add(buildFence());
        g.position.set(x, 0, z);
        g.rotation.y = rot;
        return g;
      }),
    []
  );

  return (
    <group>
      {STATIC_BUILDINGS.map((b) => (
        <Building key={b.uid} uid={b.uid} type={b.type} position={b.position} rotation={b.rotation} level={b.level} />
      ))}
      {decorativeFences.map((g, i) => (
        <primitive key={`fence-static-${i}`} object={g} />
      ))}
    </group>
  );
}
