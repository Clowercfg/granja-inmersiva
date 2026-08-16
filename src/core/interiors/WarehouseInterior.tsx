import { useEffect, useMemo, useState } from "react";
import * as THREE from "three";
import type { InteriorDef } from "../../config/interiors";
import { useCropStore } from "../../store/cropStore";
import { useGoodsStore } from "../../store/goodsStore";
import { useStorageStore } from "../../store/storageStore";
import { STORAGE_SHELVES, GOODS_SHELVES, BOARDS_Y, crateSpots, MAX_CRATES } from "./storageLayout";
import { buildWarehouseShell } from "./warehouseShell";

const CROP_ICON: Record<string, string> = { wheat: "🌾", carrot: "🥕", potato: "🥔" };
const CROP_LABEL: Record<string, string> = { wheat: "Trigo", carrot: "Zanahoria", potato: "Papa" };
const CRATE_BG: Record<string, string> = { wheat: "#8a6a2c", carrot: "#8a4a20", potato: "#6b4a26" };
const BAG_COLOR: Record<string, string> = { wheat: "#c8a24a", carrot: "#c66a22", potato: "#8f6a3c" };

const MAX_BAGS = 4;

function makeCrateTexture(cropId: string): THREE.CanvasTexture {
  const size = 256;
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext("2d")!;
  ctx.fillStyle = CRATE_BG[cropId] ?? "#7a5a2a";
  ctx.fillRect(0, 0, size, size);
  ctx.strokeStyle = "#3a2a12";
  ctx.lineWidth = 10;
  ctx.strokeRect(5, 5, size - 10, size - 10);
  ctx.font = "132px serif";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(CROP_ICON[cropId] ?? "📦", size / 2, size / 2 - 12);
  ctx.font = "bold 40px sans-serif";
  ctx.fillStyle = "#fff7e6";
  ctx.fillText(CROP_LABEL[cropId] ?? cropId, size / 2, size - 36);
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 4;
  return tex;
}

function crateMaterials(cropId: string): THREE.Material[] {
  const tex = makeCrateTexture(cropId);
  const base = new THREE.MeshStandardMaterial({
    color: "#5a4524",
    roughness: 0.9,
    emissive: "#ffffff",
    emissiveIntensity: 0,
  });
  const face = new THREE.MeshStandardMaterial({
    map: tex,
    roughness: 0.9,
    emissive: "#ffffff",
    emissiveIntensity: 0,
  });
  return [base, base.clone(), base.clone(), base.clone(), face, face.clone()];
}

function ShelfFrame({
  hovered,
  onHoverChange,
  onBoardClick,
}: {
  hovered: boolean;
  onHoverChange: (v: boolean) => void;
  onBoardClick: () => void;
}) {
  return (
    <>
      <mesh position={[-0.98, 1.2, 0]} castShadow receiveShadow>
        <boxGeometry args={[0.08, 2.4, 0.7]} />
        <meshStandardMaterial color="#4a3524" roughness={0.9} />
      </mesh>
      <mesh position={[0.98, 1.2, 0]} castShadow receiveShadow>
        <boxGeometry args={[0.08, 2.4, 0.7]} />
        <meshStandardMaterial color="#4a3524" roughness={0.9} />
      </mesh>
      {BOARDS_Y.map((by) => (
        <mesh
          key={by}
          position={[0, by, 0]}
          castShadow
          receiveShadow
          onClick={(e) => {
            e.stopPropagation();
            onBoardClick();
          }}
          onPointerOver={(e) => {
            e.stopPropagation();
            onHoverChange(true);
          }}
          onPointerOut={() => onHoverChange(false)}
        >
          <boxGeometry args={[2.0, 0.06, 0.7]} />
          <meshStandardMaterial
            color="#8a6438"
            roughness={0.8}
            emissive="#ffd977"
            emissiveIntensity={hovered ? 0.25 : 0}
          />
        </mesh>
      ))}
    </>
  );
}

function StorageShelf({ id, harvest, seeds }: { id: string; harvest: number; seeds: number }) {
  const [hovered, setHovered] = useState(false);
  const crateGeo = useMemo(() => new THREE.BoxGeometry(0.34, 0.24, 0.3), []);
  const bagGeo = useMemo(() => new THREE.CylinderGeometry(0.09, 0.12, 0.16, 10), []);
  const mats = useMemo(() => crateMaterials(id), [id]);
  const crates = useMemo(() => crateSpots(harvest), [harvest]);
  const bags = Math.min(seeds, MAX_BAGS);

  useEffect(() => {
    for (const m of mats) (m as THREE.MeshStandardMaterial).emissiveIntensity = hovered ? 0.3 : 0;
  }, [mats, hovered]);

  useEffect(
    () => () => {
      for (const m of mats) m.dispose();
      const face = mats[4] as THREE.MeshStandardMaterial;
      face.map?.dispose();
    },
    [mats]
  );

  const openCrate = (crateIndex: number) => useStorageStore.getState().openCrate({ id, crateIndex });
  const setHover = (v: boolean) => {
    setHovered(v);
    document.body.style.cursor = v ? "pointer" : "default";
  };

  return (
    <group>
      <ShelfFrame hovered={hovered} onHoverChange={setHover} onBoardClick={() => openCrate(0)} />
      {crates.map((c, i) => (
        <mesh
          key={i}
          position={[c.x, c.y, c.z]}
          geometry={crateGeo}
          material={mats}
          castShadow
          receiveShadow
          onClick={(e) => {
            e.stopPropagation();
            openCrate(i);
          }}
          onPointerOver={(e) => {
            e.stopPropagation();
            setHover(true);
          }}
          onPointerOut={() => setHover(false)}
        />
      ))}
      {Array.from({ length: bags }).map((_, i) => (
        <mesh
          key={`bag${i}`}
          position={[-0.8 + (i % 2) * 0.3, 0.08 + Math.floor(i / 2) * 0.16, 0.5]}
          geometry={bagGeo}
          castShadow
          receiveShadow
        >
          <meshStandardMaterial color={BAG_COLOR[id] ?? "#b08a4a"} roughness={0.95} />
        </mesh>
      ))}
    </group>
  );
}

function MilkUnit({ hovered }: { hovered: boolean }) {
  const glow = hovered ? 0.35 : 0;
  return (
    <group>
      <mesh position={[0, -0.11, 0]} castShadow receiveShadow>
        <boxGeometry args={[0.28, 0.03, 0.22]} />
        <meshStandardMaterial color="#8a5a30" roughness={0.9} emissive="#ffd977" emissiveIntensity={glow} />
      </mesh>
      {[0, 1, 2].map((i) => (
        <group key={i} position={[-0.085 + i * 0.085, -0.05, 0]}>
          <mesh material={MILK_BODY} castShadow>
            <cylinderGeometry args={[0.04, 0.04, 0.13, 12]} />
          </mesh>
          <mesh position={[0, 0.075, 0]} material={i === 1 ? MILK_CAP_BLUE : MILK_CAP_RED} castShadow>
            <cylinderGeometry args={[0.024, 0.024, 0.025, 10]} />
          </mesh>
        </group>
      ))}
    </group>
  );
}

const MILK_BODY = new THREE.MeshStandardMaterial({ color: "#eef4ff", roughness: 0.3 });
const MILK_CAP_BLUE = new THREE.MeshStandardMaterial({ color: "#3d6fb4", roughness: 0.4 });
const MILK_CAP_RED = new THREE.MeshStandardMaterial({ color: "#c94f4f", roughness: 0.4 });

function EggUnit({ hovered }: { hovered: boolean }) {
  const glow = hovered ? 0.3 : 0;
  return (
    <group>
      <mesh position={[0, -0.1, 0]} castShadow receiveShadow>
        <boxGeometry args={[0.28, 0.035, 0.22]} />
        <meshStandardMaterial color="#efe3c4" roughness={0.7} emissive="#ffd977" emissiveIntensity={glow} />
      </mesh>
      {[
        [-0.06, -0.04],
        [-0.06, 0.04],
        [0.06, -0.04],
        [0.06, 0.04],
      ].map(([x, z], i) => (
        <mesh key={i} position={[x, -0.075, z]} castShadow>
          <sphereGeometry args={[0.03, 10, 8]} />
          <meshStandardMaterial color="#fdf6e6" roughness={0.5} />
        </mesh>
      ))}
    </group>
  );
}

function HoneyUnit({ hovered }: { hovered: boolean }) {
  const glow = hovered ? 0.35 : 0;
  return (
    <group>
      <mesh position={[0, -0.06, 0]} castShadow receiveShadow>
        <cylinderGeometry args={[0.08, 0.08, 0.12, 14]} />
        <meshStandardMaterial color="#e8b64c" roughness={0.35} emissive="#ffd977" emissiveIntensity={glow} />
      </mesh>
      <mesh position={[0, 0.015, 0]} castShadow>
        <cylinderGeometry args={[0.045, 0.045, 0.03, 12]} />
        <meshStandardMaterial color="#7a4a28" roughness={0.8} />
      </mesh>
    </group>
  );
}

function CheeseUnit({ hovered }: { hovered: boolean }) {
  const glow = hovered ? 0.35 : 0;
  return (
    <group>
      <mesh position={[0, -0.095, 0]} castShadow receiveShadow>
        <cylinderGeometry args={[0.115, 0.115, 0.05, 16]} />
        <meshStandardMaterial color="#f0b429" roughness={0.55} emissive="#ffd977" emissiveIntensity={glow} />
      </mesh>
      <mesh position={[0, -0.05, 0]} castShadow>
        <cylinderGeometry args={[0.115, 0.115, 0.04, 16]} />
        <meshStandardMaterial color="#f6c84a" roughness={0.55} emissive="#ffd977" emissiveIntensity={glow} />
      </mesh>
    </group>
  );
}

function GoodsUnit({ id, hovered }: { id: string; hovered: boolean }) {
  switch (id) {
    case "milk":
      return <MilkUnit hovered={hovered} />;
    case "eggs":
      return <EggUnit hovered={hovered} />;
    case "honey":
      return <HoneyUnit hovered={hovered} />;
    case "cheese":
      return <CheeseUnit hovered={hovered} />;
    default:
      return null;
  }
}

function GoodsShelf({ id, count }: { id: string; count: number }) {
  const [hovered, setHovered] = useState<number | null>(null);
  const spots = crateSpots(count);
  const openCrate = (crateIndex: number) => useStorageStore.getState().openCrate({ id, crateIndex });
  const setHover = (v: number | null) => {
    setHovered(v);
    document.body.style.cursor = v !== null ? "pointer" : "default";
  };

  return (
    <group>
      <ShelfFrame hovered={hovered !== null} onHoverChange={(v) => setHover(v ? 0 : null)} onBoardClick={() => openCrate(0)} />
      {spots.map((s, i) => (
        <group
          key={i}
          position={[s.x, s.y, s.z]}
          onClick={(e) => {
            e.stopPropagation();
            openCrate(i);
          }}
          onPointerOver={(e) => {
            e.stopPropagation();
            setHover(i);
          }}
          onPointerOut={() => setHover(null)}
        >
          <GoodsUnit id={id} hovered={hovered === i} />
        </group>
      ))}
    </group>
  );
}

export function WarehouseInterior({ def }: { def: InteriorDef }) {
  const shell = useMemo(() => buildWarehouseShell(def), [def]);
  const cropInventory = useCropStore((s) => s.inventory);
  const goodsInventory = useGoodsStore((s) => s.inventory);

  return (
    <group>
      <primitive object={shell} />
      {STORAGE_SHELVES.map((s) => (
        <group key={s.id} position={[s.x, 0, s.z]}>
          <StorageShelf
            id={s.id}
            harvest={cropInventory[s.id]?.harvest ?? 0}
            seeds={cropInventory[s.id]?.seeds ?? 0}
          />
        </group>
      ))}
      {GOODS_SHELVES.map((s) => (
        <group key={s.id} position={[s.x, 0, s.z]}>
          <GoodsShelf id={s.id} count={goodsInventory[s.id] ?? 0} />
        </group>
      ))}
      <pointLight position={[0, 3.6, 0]} intensity={22} distance={20} decay={1.6} color="#ffdfae" />
      <pointLight position={[-4.5, 3.2, -2.5]} intensity={16} distance={15} decay={1.6} color="#ffd9a8" />
      <pointLight position={[4.5, 3.2, 2.0]} intensity={14} distance={15} decay={1.6} color="#ffe3bd" />
      <pointLight position={[-4.8, 3.2, 2.2]} intensity={13} distance={15} decay={1.6} color="#ffe8c2" />
      <hemisphereLight args={["#fff3e0", "#5c4526", 0.65]} />
    </group>
  );
}
