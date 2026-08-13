import { useMemo } from "react";
import * as THREE from "three";
import { bakeColorTexture, bakeNormalTexture, terrainHeight } from "../../utils/terrain";
import { WORLD } from "../../config/world";

export function Terrain() {
  const { colorTex, normalTex } = useMemo(() => {
    return {
      colorTex: bakeColorTexture(1024),
      normalTex: bakeNormalTexture(256),
    };
  }, []);

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
    />
  );
}
