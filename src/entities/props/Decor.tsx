import { useMemo } from "react";
import * as THREE from "three";
import { useAsset } from "../../core/assets/useAsset";
import { cloneAsset } from "../../core/assets/assetStore";
import { POND, WATER_Y, terrainHeight } from "../../utils/terrain";
import { makeRng } from "../../utils/math";

const LOG_SPOTS: Array<[number, number, number]> = [
  [16, 6, 0.7],
  [-24, 26, 0.5],
  [20, -20, -0.4],
];

const STUMP_SPOTS: Array<[number, number, number]> = [
  [-28, -10, 0.3],
  [30, 20, 1.2],
  [-20, -24, -1.0],
  [18, -18, 0.8],
];

const SIGN_SPOTS: Array<[number, number, number]> = [[30, 7.5, -Math.PI / 2]];

function PlacedProps({
  assetKey,
  spots,
  scale,
}: {
  assetKey: string;
  spots: Array<[number, number, number]>;
  scale: number;
}) {
  const asset = useAsset(assetKey);
  const items = useMemo(
    () =>
      spots.map(([x, z, yaw]) => {
        const model = cloneAsset(asset);
        if (!model) return null;
        model.position.set(x, terrainHeight(x, z), z);
        model.rotation.y = yaw;
        model.scale.setScalar(scale);
        return model;
      }),
    [asset, spots, scale]
  );

  return (
    <group>
      {items.map((m, i) => (m ? <primitive key={i} object={m} /> : null))}
    </group>
  );
}

function WaterLilies() {
  const asset = useAsset("prop:lily");
  const items = useMemo(() => {
    const rng = makeRng(424242);
    const out: THREE.Object3D[] = [];
    for (let i = 0; i < 14; i++) {
      const model = cloneAsset(asset);
      if (!model) break;
      const r = Math.sqrt(rng()) * POND.radius * 0.6;
      const a = rng() * Math.PI * 2;
      model.position.set(POND.x + Math.cos(a) * r, WATER_Y - 0.05, POND.z + Math.sin(a) * r);
      model.rotation.y = rng() * Math.PI * 2;
      model.scale.setScalar(1 + rng() * 0.6);
      out.push(model);
    }
    return out;
  }, [asset]);

  return (
    <group>
      {items.map((m, i) => (
        <primitive key={i} object={m} />
      ))}
    </group>
  );
}

export function Decor() {
  return (
    <group>
      <WaterLilies />
      <PlacedProps assetKey="prop:logStack" spots={LOG_SPOTS} scale={1.4} />
      <PlacedProps assetKey="prop:stump" spots={STUMP_SPOTS} scale={1.1} />
      <PlacedProps assetKey="prop:sign" spots={SIGN_SPOTS} scale={1} />
    </group>
  );
}
