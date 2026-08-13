import { useMemo, useRef } from "react";
import * as THREE from "three";
import { bakeColorTexture, bakeNormalTexture, terrainHeight } from "../../utils/terrain";
import { WORLD } from "../../config/world";
import { useSelectionStore } from "../../store/selectionStore";
import { useAsset } from "../../core/assets/useAsset";

export function Terrain() {
  const colorAsset = useAsset("terrain-color");
  const normalAsset = useAsset("terrain-normal");

  const proceduralTex = useRef<{ color: THREE.Texture; normal: THREE.Texture } | null>(null);
  if (!proceduralTex.current) {
    proceduralTex.current = { color: bakeColorTexture(1024), normal: bakeNormalTexture(256) };
  }

  const { colorTex, normalTex } = useMemo(
    () => ({
      colorTex: colorAsset.status === "loaded" && colorAsset.texture ? colorAsset.texture : proceduralTex.current!.color,
      normalTex: normalAsset.status === "loaded" && normalAsset.texture ? normalAsset.texture : proceduralTex.current!.normal,
    }),
    [colorAsset, normalAsset]
  );

  const geometry = useMemo(() => {
    const size = WORLD.size;
    const segs = 170;
    const geo = new THREE.PlaneGeometry(size, size, segs, segs);
    geo.rotateX(-Math.PI / 2);
    const pos = geo.attributes.position;
    for (let i = 0; i < pos.count; i++) {
      pos.setY(i, terrainHeight(pos.getX(i), pos.getZ(i)));
    }
    geo.computeVertexNormals();
    return geo;
  }, []);

  return (
    <mesh
      geometry={geometry}
      receiveShadow
      material={
        new THREE.MeshStandardMaterial({
          map: colorTex,
          normalMap: normalTex,
          normalScale: new THREE.Vector2(0.8, 0.8),
          roughness: 1,
          metalness: 0,
        })
      }
      dispose={null}
      onClick={(e: { stopPropagation: () => void }) => {
        e.stopPropagation();
        useSelectionStore.getState().select(null);
      }}
    />
  );
}
