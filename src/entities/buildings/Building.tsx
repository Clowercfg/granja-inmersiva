import { useMemo } from "react";
import * as THREE from "three";
import type { BuildingType } from "../../config/world";
import { BUILDING_CONFIG } from "../../config/world";
import { BUILDING_LABEL } from "../../config/layout";
import { buildBarn, buildHouse, buildWarehouse, buildGreenhouse, buildWorkshop } from "./buildingFactory";
import { useSelectionStore } from "../../store/selectionStore";
import { useInteriorStore } from "../../store/interiorStore";
import { terrainHeight } from "../../utils/terrain";
import { SelectionRing } from "../common/SelectionRing";
import { useAsset } from "../../core/assets/useAsset";
import { cloneAsset } from "../../core/assets/assetStore";

export interface BuildingProps {
  uid: string;
  type: BuildingType;
  position: [number, number, number];
  rotation: number;
  level: number;
}

function buildMesh(type: BuildingType): THREE.Group {
  switch (type) {
    case "barn":
      return buildBarn();
    case "house":
      return buildHouse();
    case "warehouse":
      return buildWarehouse();
    case "greenhouse":
      return buildGreenhouse();
    case "workshop":
      return buildWorkshop();
    default:
      return new THREE.Group();
  }
}

export function Building({ uid, type, position, rotation, level }: BuildingProps) {
  const asset = useAsset(`building:${type}`);
  const mesh = useMemo(() => cloneAsset(asset) ?? buildMesh(type), [asset, type]);
  const select = useSelectionStore((s) => s.select);
  const setHover = useSelectionStore((s) => s.setHover);
  const selected = useSelectionStore((s) => s.selected?.uid === uid);
  const hovered = useSelectionStore((s) => s.hovered?.uid === uid);
  const hiddenUid = useInteriorStore((s) => s.hiddenUid);
  const cfg = BUILDING_CONFIG[type];

  if (hiddenUid === uid) return null;

  const groundY = terrainHeight(position[0], position[2]);

  return (
    <group position={[position[0], groundY, position[2]]} rotation={[0, rotation, 0]}>
      <primitive
        object={mesh}
        onClick={(e: { stopPropagation: () => void }) => {
          e.stopPropagation();
          select({
            kind: "building",
            uid,
            title: cfg.name,
            subtitle: `${BUILDING_LABEL[type]} · Nivel ${level}`,
          });
        }}
        onPointerOver={(e: { stopPropagation: () => void }) => {
          e.stopPropagation();
          setHover({
            kind: "building",
            uid,
            title: cfg.name,
            subtitle: BUILDING_LABEL[type],
          });
          document.body.style.cursor = "pointer";
        }}
        onPointerOut={() => {
          setHover(null);
          document.body.style.cursor = "default";
        }}
      />
      {selected && <SelectionRing position={[0, 0.25, 0]} />}
      {hovered && !selected && <SelectionRing position={[0, 0.25, 0]} color="#ffffff" pulse={false} />}
    </group>
  );
}
