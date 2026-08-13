import { useMemo, useRef } from "react";
import * as THREE from "three";
import { useFrame } from "@react-three/fiber";
import { POND, WATER_Y } from "../../utils/terrain";
import { createWaterMaterial } from "../../shaders/water";
import { atmosphere } from "../../shaders/atmosphere";
import { useRendererMode } from "../../core/renderer/useRendererMode";

export function Water() {
  const mode = useRendererMode();
  const center = useMemo(() => new THREE.Vector2(POND.x, POND.z), []);
  const radius = POND.radius + 1.5;

  const geo = useMemo(() => {
    const g = new THREE.CircleGeometry(radius + 1.5, 64);
    g.rotateX(-Math.PI / 2);
    return g;
  }, [radius]);

  const shaderMat = useMemo(() => createWaterMaterial(center, radius), [center, radius]);
  const ref = useRef<THREE.Mesh>(null);

  useFrame(() => {
    const m = ref.current?.material as THREE.ShaderMaterial | undefined;
    if (m && m.isShaderMaterial) {
      m.uniforms.uTime.value = atmosphere.uTime.value;
      m.uniforms.uSunDir.value.copy(atmosphere.uSunDir.value);
      m.uniforms.uSunColor.value.copy(atmosphere.uSunColor.value);
      m.uniforms.uSkyColor.value.copy(atmosphere.uSkyColor.value);
      m.uniforms.uFogColor.value.copy(atmosphere.uFogColor.value);
      m.uniforms.uFogDensity.value = atmosphere.uFogDensity.value;
    }
  });

  if (mode === "webgpu") {
    return (
      <mesh
        ref={ref}
        geometry={geo}
        position={[POND.x, WATER_Y, POND.z]}
        renderOrder={5}
        material={
          new THREE.MeshPhysicalMaterial({
            color: "#2e6b5c",
            transparent: true,
            opacity: 0.85,
            roughness: 0.12,
            metalness: 0.05,
            clearcoat: 1,
            clearcoatRoughness: 0.15,
            side: THREE.DoubleSide,
            depthWrite: false,
          })
        }
      />
    );
  }

  return (
    <mesh
      ref={ref}
      geometry={geo}
      position={[POND.x, WATER_Y, POND.z]}
      material={shaderMat}
    />
  );
}
