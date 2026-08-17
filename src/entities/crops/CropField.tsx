import { useEffect, useMemo, useRef, useState } from "react";
import * as THREE from "three";
import { useFrame } from "@react-three/fiber";
import { useAsset } from "../../core/assets/useAsset";
import { geometryFromObject, ensureWhiteVertexColors } from "../../core/assets/assetStore";
import { CROP_TYPES, PLOT_CROPS, type CropTypeDef } from "../../config/crops";
import { PLOTS, type PlotRect } from "../../utils/terrain";
import { terrainHeight } from "../../utils/terrain";
import { isInsideBuilding } from "../../config/layout";
import { makeRng } from "../../utils/math";
import { useCropStore, growthProgressOf, type PlantedCrop } from "../../store/cropStore";
import { SelectionRing } from "../common/SelectionRing";

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

/** Posiciones de las plantas de un cultivo en una parcela: [x, z, y, rotY]. */
function cropInstanceList(
  crop: CropTypeDef,
  plot: PlotRect,
  rng: () => number
): Array<[number, number, number, number]> {
  const list: Array<[number, number, number, number]> = [];
  const cols = Math.max(2, Math.floor((plot.w - 1.2) / crop.spacing));
  for (let r = 0; r < crop.rows; r++) {
    for (let c = 0; c < cols; c++) {
      const tx = (c + 0.5) / cols;
      const tz = (r + 0.5) / crop.rows;
      const x = plot.cx + (tx - 0.5) * (plot.w - 0.8) + (rng() - 0.5) * 0.25;
      const z = plot.cz + (tz - 0.5) * (plot.d - 0.8) + (rng() - 0.5) * 0.25;
      if (isInsideBuilding(x, z)) continue;
      list.push([x, z, terrainHeight(x, z), rng() * Math.PI * 2]);
    }
  }
  return list;
}

/** Construye el InstancedMesh de un cultivo (matrices sin escala aún). */
function useCropMesh(
  crop: CropTypeDef,
  plot: PlotRect
): { mesh: THREE.InstancedMesh; list: Array<[number, number, number, number]> } {
  const asset = useAsset(crop.assetKey);

  const list = useMemo(() => cropInstanceList(crop, plot, makeRng(plot.cx * 1000 + plot.cz)), [crop, plot]);

  const geo = useMemo(() => {
    if (asset.status === "loaded" && asset.object) {
      const loaded = geometryFromObject(asset.object);
      if (loaded) return ensureWhiteVertexColors(loaded);
    }
    return buildCropPlaceholder(crop);
  }, [asset, crop]);

  const mesh = useMemo(() => {
    const mat = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.95, metalness: 0 });
    const m = new THREE.InstancedMesh(geo, mat, list.length);
    m.castShadow = false;
    m.receiveShadow = true;

    const matrix = new THREE.Matrix4();
    const q = new THREE.Quaternion();
    const euler = new THREE.Euler();
    const s = new THREE.Vector3();
    const col = new THREE.Color();
    const colors = new Float32Array(list.length * 3);
    const rngCol = makeRng(plot.cx * 1000 + plot.cz + 3);

    list.forEach(([x, z, y, rot], i) => {
      euler.set(0, rot, 0);
      q.setFromEuler(euler);
      s.set(0.01, 0.01, 0.01);
      matrix.compose(new THREE.Vector3(x, y, z), q, s);
      m.setMatrixAt(i, matrix);
      col.setHSL(0.2 + rngCol() * 0.05, 0.1, 0.9 + rngCol() * 0.1);
      colors[i * 3] = col.r;
      colors[i * 3 + 1] = col.g;
      colors[i * 3 + 2] = col.b;
    });

    m.instanceMatrix.needsUpdate = true;
    m.instanceColor = new THREE.InstancedBufferAttribute(colors, 3);
    return m;
  }, [geo, list, plot]);

  return { mesh, list };
}

/** Filas estáticas de un cultivo (parcelas no interactivas). */
function CropFieldRows({ crop, plot }: { crop: CropTypeDef; plot: PlotRect }) {
  const { mesh, list } = useCropMesh(crop, plot);

  useEffect(() => {
    const rng = makeRng(plot.cx * 1000 + plot.cz);
    const matrix = new THREE.Matrix4();
    const q = new THREE.Quaternion();
    const euler = new THREE.Euler();
    const s = new THREE.Vector3();
    list.forEach(([x, z, y, rot], i) => {
      const sc = crop.heightMin + rng() * (crop.heightMax - crop.heightMin);
      euler.set(0, rot, 0);
      q.setFromEuler(euler);
      s.set(sc, sc, sc);
      matrix.compose(new THREE.Vector3(x, y, z), q, s);
      mesh.setMatrixAt(i, matrix);
    });
    mesh.instanceMatrix.needsUpdate = true;
  }, [mesh, list, crop, plot]);

  return <primitive object={mesh} dispose={null} />;
}

/** Filas dinámicas de un cultivo que crece según el progreso (escala 0..1). */
function GrowingCropRows({
  crop,
  plot,
  planted,
  onHarvest,
}: {
  crop: CropTypeDef;
  plot: PlotRect;
  planted: PlantedCrop;
  onHarvest: () => void;
}) {
  const { mesh, list } = useCropMesh(crop, plot);
  const ready = planted.state === "ready";

  const meshRef = useRef<THREE.InstancedMesh>(null);
  useFrame(() => {
    const m = meshRef.current;
    if (!m) return;
    const p = ready ? 1 : growthProgressOf(planted);
    const scale = crop.heightMin + (crop.heightMax - crop.heightMin) * p;
    const matrix = new THREE.Matrix4();
    const q = new THREE.Quaternion();
    const euler = new THREE.Euler();
    const s = new THREE.Vector3();
    list.forEach(([x, z, y, rot], i) => {
      euler.set(0, rot, 0);
      q.setFromEuler(euler);
      s.set(scale, scale, scale);
      matrix.compose(new THREE.Vector3(x, y, z), q, s);
      m.setMatrixAt(i, matrix);
    });
    m.instanceMatrix.needsUpdate = true;
  });

  return (
    <group
      onClick={(e) => {
        e.stopPropagation();
        onHarvest();
      }}
    >
      <primitive object={mesh} ref={meshRef} dispose={null} />
    </group>
  );
}

/** Parcela interactiva: clic para sembrar (abre panel de cultivos), clic en cultivo listo para cosechar. */
function CropPlot({ plotIndex }: { plotIndex: number }) {
  const planted = useCropStore((s) => s.planted.find((p) => p.plotIndex === plotIndex) ?? null);
  const [hovered, setHovered] = useState(false);
  const [harvestFlash, setHarvestFlash] = useState(false);
  const plot = PLOTS[plotIndex];
  const groundY = terrainHeight(plot.cx, plot.cz);

  const cropDef = planted ? (CROP_TYPES.find((c) => c.id === planted.cropId) ?? CROP_TYPES[0]) : null;

  const onPlotClick = () => {
    if (planted) return;
  };
  const onHarvest = () => {
    if (planted?.state !== "ready") return;
    useCropStore.getState().harvestCrop(planted.id);
    setHarvestFlash(true);
    setTimeout(() => setHarvestFlash(false), 600);
  };

  const onOver = () => {
    setHovered(true);
    document.body.style.cursor = planted?.state === "ready" ? "pointer" : "default";
  };
  const onOut = () => {
    setHovered(false);
    document.body.style.cursor = "default";
  };

  const ringColor = harvestFlash ? "#7ac74f" : !planted ? "#7ac74f" : planted.state === "ready" ? "#ffd977" : "#ffffff";

  return (
    <group>
      <mesh
        position={[plot.cx, groundY + 0.03, plot.cz]}
        rotation={[-Math.PI / 2, 0, 0]}
        onClick={(e) => {
          e.stopPropagation();
          onPlotClick();
        }}
        onPointerOver={(e) => {
          e.stopPropagation();
          onOver();
        }}
        onPointerOut={onOut}
      >
        <planeGeometry args={[plot.w - 0.3, plot.d - 0.3]} />
        <meshStandardMaterial color={harvestFlash ? "#3a7a1e" : "#5e442e"} roughness={1} metalness={0} />
      </mesh>
      {hovered && (
        <SelectionRing
          position={[plot.cx, groundY + 0.12, plot.cz]}
          color={ringColor}
          pulse={!!planted}
        />
      )}
      {planted && cropDef && <GrowingCropRows crop={cropDef} plot={plot} planted={planted} onHarvest={onHarvest} />}
    </group>
  );
}

export function CropField() {
  const rows = useMemo(
    () =>
      PLOT_CROPS.filter((pc) => pc.plotIndex >= PLOTS.length || !PLOTS[pc.plotIndex]).map((pc) => ({
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
      {PLOTS.map((_, i) => (
        <CropPlot key={i} plotIndex={i} />
      ))}
    </group>
  );
}
