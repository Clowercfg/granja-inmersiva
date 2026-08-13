import { useMemo } from "react";
import * as THREE from "three";
import { STATIC_BUILDINGS, FENCE_SEGMENTS } from "../../config/layout";
import { buildFence } from "./buildingFactory";
import { Building } from "./Building";
import { useAsset } from "../../core/assets/useAsset";
import { cloneAsset } from "../../core/assets/assetStore";
import { terrainHeight } from "../../utils/terrain";

const FENCE_TILE = 1.2;
const FENCE_TILES = 5;

export function Buildings() {
  const fenceAsset = useAsset("fence");
  const decorativeFences = useMemo(
    () =>
      FENCE_SEGMENTS.map(([x, z, rot]) => {
        const g = new THREE.Group();
        for (let k = 0; k < FENCE_TILES; k++) {
          const tile = cloneAsset(fenceAsset);
          if (!tile) break;
          tile.position.x = (k - (FENCE_TILES - 1) / 2) * FENCE_TILE;
          g.add(tile);
        }
        if (g.children.length === 0) g.add(buildFence());
        g.position.set(x, terrainHeight(x, z), z);
        g.rotation.y = rot;
        return g;
      }),
    [fenceAsset]
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
