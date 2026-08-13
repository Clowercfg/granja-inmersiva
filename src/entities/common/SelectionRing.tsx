import { useRef } from "react";
import * as THREE from "three";
import { useFrame } from "@react-three/fiber";

export function SelectionRing({
  position,
  color = "#7ac74f",
  pulse = true,
}: {
  position: [number, number, number];
  color?: string;
  pulse?: boolean;
}) {
  const ref = useRef<THREE.Mesh>(null);

  useFrame((state) => {
    const m = ref.current;
    if (!m || !pulse) return;
    const t = state.clock.elapsedTime;
    const s = 1 + Math.sin(t * 3) * 0.08;
    m.scale.set(s, s, 1);
    m.rotation.z = -t * 0.4;
    const mat = m.material as THREE.MeshBasicMaterial;
    mat.opacity = 0.75 + Math.sin(t * 3) * 0.25;
  });

  return (
    <group position={position}>
      <mesh ref={ref} rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[1.15, 1.5, 48]} />
        <meshBasicMaterial color={color} transparent opacity={0.9} side={THREE.DoubleSide} depthWrite={false} />
      </mesh>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.02, 0]}>
        <circleGeometry args={[1.12, 32]} />
        <meshBasicMaterial color={color} transparent opacity={0.16} depthWrite={false} />
      </mesh>
    </group>
  );
}
