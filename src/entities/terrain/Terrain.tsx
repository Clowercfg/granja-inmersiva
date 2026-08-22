import { useEffect, useMemo, useRef, useState } from "react";
import * as THREE from "three";
import { bakeColorTexture, bakeNormalTexture, terrainHeight } from "../../utils/terrain";
import { WORLD } from "../../config/world";
import { useSelectionStore } from "../../store/selectionStore";
import { useAsset } from "../../core/assets/useAsset";
import { useWorldStore } from "../../store/worldStore";
import { mark } from "../../core/bootMetrics";

const FALLBACK_COLOR = "#889966";

export function Terrain() {
  const colorAsset = useAsset("terrain-color");
  const normalAsset = useAsset("terrain-normal");
  const booted = useWorldStore((s) => s.booted);
  const [baked, setBaked] = useState<{ color: THREE.Texture; normal: THREE.Texture } | null>(null);

  useEffect(() => {
    if (booted && !baked) {
      const raf = requestAnimationFrame(() => {
        mark("terrain_bake_start");
        const color = bakeColorTexture(1024);
        const normal = bakeNormalTexture(256);
        mark("terrain_bake_done");
        setBaked({ color, normal });
      });
      return () => cancelAnimationFrame(raf);
    }
  }, [booted, baked]);

  const { colorTex, normalTex } = useMemo(() => {
    if (colorAsset.status === "loaded" && colorAsset.texture) {
      return { colorTex: colorAsset.texture, normalTex: normalAsset.texture ?? null };
    }
    if (baked) return { colorTex: baked.color, normalTex: baked.normal };
    return { colorTex: null, normalTex: null };
  }, [colorAsset, normalAsset, baked]);

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

  const material = useMemo(() => {
    if (!colorTex) {
      return new THREE.MeshStandardMaterial({
        color: FALLBACK_COLOR,
        roughness: 1,
        metalness: 0,
      });
    }
    return new THREE.MeshStandardMaterial({
      map: colorTex,
      normalMap: normalTex ?? undefined,
      normalScale: new THREE.Vector2(0.8, 0.8),
      roughness: 1,
      metalness: 0,
    });
  }, [colorTex, normalTex]);

  return (
    <mesh
      geometry={geometry}
      receiveShadow
      material={material}
      dispose={null}
      onClick={(e: { stopPropagation: () => void }) => {
        e.stopPropagation();
        useSelectionStore.getState().select(null);
      }}
    />
  );
}
