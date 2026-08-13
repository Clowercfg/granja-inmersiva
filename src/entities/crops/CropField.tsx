import { useMemo, useRef } from "react";
import * as THREE from "three";
import { useAsset } from "../../core/assets/useAsset";
import { geometryFromObject, ensureWhiteVertexColors } from "../../core/assets/assetStore";
import { CROP_TYPES, PLOT_CROPS, type CropTypeDef } from "../../config/crops";
import { PLOTS, type PlotRect } from "../../utils/terrain";
import { terrainHeight } from "../../utils/terrain";
import { makeRng } from "../../utils/math";

function buildCropPlaceholder(def: CropTypeDef): THREE.BufferGeometry {
  const stemGeo = new THREE.CylinderGeometry(0.03, 0.05, def.heightMax, 5);
  stemGeo.translate(0, def.heightMax / 2, 0);
  const head = new THREE.IcosahedronGeometry(0.12, 0);
  head.translate(0, def.heightMax + 0.06, 0);

  const stemCount = stemGeo.attributes.position.count;
  const headCount = head.attributes.position.count;
  const total = stemCount + headCount;

  const positions = new Float32Array(total * 3);
  positions.set(stemGeo.attributes.position.array as Float32Array, 0);
  positions.set(head.attributes.position.array as Float32Array, stemCount * 3);

  const stemColor = new THREE.Color(def.color);
  const headColor = new THREE.Color(def.headColor);
  const colors = new Float32Array(total * 3);
  for (let i = 0; i < stemCount; i++) {
    colors[i * 3] = stemColor.r;
    colors[i * 3 + 1] = stemColor.g;
    colors[i * 3 + 2] = stemColor.b;
  }
  for (let i = 0; i < headCount; i++) {
    const o = (stemCount + i) * 3;
    colors[o] = headColor.r;
    colors[o + 1] = headColor.g;
    colors[o + 2] = headColor.b;
  }

  const geo = new THREE.BufferGeometry();
  geo.setAttribute("position", new THREE.BufferAttribute(positions, 3));
  geo.setAttribute("color", new THREE.BufferAttribute(colors, 3));
  geo.computeVertexNormals();
  return geo;
}

function CropFieldRows({ crop, plot }: { crop: CropTypeDef; plot: PlotRect }) {
  const asset = useAsset(crop.assetKey);

  const rng = useMemo(() => makeRng(plot.cx * 1000 + plot.cz), [plot]);

  const instances = useMemo(() => {
    const list: Array<[number, number, number, number]> = [];
    const cols = Math.max(2, Math.floor((plot.w - 1.2) / crop.spacing));
    for (let r = 0; r < crop.rows; r++) {
      for (let c = 0; c < cols; c++) {
        const tx = (c + 0.5) / cols;
        const tz = (r + 0.5) / crop.rows;
        const x = plot.cx + (tx - 0.5) * (plot.w - 0.8) + (rng() - 0.5) * 0.25;
        const z = plot.cz + (tz - 0.5) * (plot.d - 0.8) + (rng() - 0.5) * 0.25;
        list.push([x, z, terrainHeight(x, z), crop.heightMin + rng() * (crop.heightMax - crop.heightMin)]);
      }
    }
    return list;
  }, [crop, plot, rng]);

  const geo = useMemo(() => {
    if (asset.status === "loaded" && asset.object) {
      const loaded = geometryFromObject(asset.object);
      if (loaded) return ensureWhiteVertexColors(loaded);
    }
    return buildCropPlaceholder(crop);
  }, [asset, crop]);

  const mesh = useMemo(() => {
    const mat = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.95, metalness: 0 });
    const m = new THREE.InstancedMesh(geo, mat, instances.length);
    m.castShadow = false;
    m.receiveShadow = true;

    const matrix = new THREE.Matrix4();
    const q = new THREE.Quaternion();
    const euler = new THREE.Euler();
    const s = new THREE.Vector3();
    const col = new THREE.Color();
    const colors = new Float32Array(instances.length * 3);

    instances.forEach(([x, z, y, sc], i) => {
      euler.set(0, rng() * Math.PI * 2, 0);
      q.setFromEuler(euler);
      s.set(sc, sc, sc);
      matrix.compose(new THREE.Vector3(x, y, z), q, s);
      m.setMatrixAt(i, matrix);
      col.setHSL(0.2 + rng() * 0.05, 0.1, 0.9 + rng() * 0.1);
      colors[i * 3] = col.r;
      colors[i * 3 + 1] = col.g;
      colors[i * 3 + 2] = col.b;
    });

    m.instanceMatrix.needsUpdate = true;
    m.instanceColor = new THREE.InstancedBufferAttribute(colors, 3);
    return m;
  }, [geo, instances, rng]);

  const ref = useRef<THREE.InstancedMesh>(null);
  return <primitive object={mesh} ref={ref} dispose={null} />;
}

export function CropField() {
  const rows = useMemo(
    () =>
      PLOT_CROPS.map((pc) => ({
        crop: CROP_TYPES.find((c) => c.id === pc.cropId) ?? CROP_TYPES[0],
        plot: PLOTS[pc.plotIndex],
      })),
    []
  );

  return (
    <group>
      {rows.map(({ crop, plot }) => (
        <CropFieldRows key={crop.id} crop={crop} plot={plot} />
      ))}
    </group>
  );
}
