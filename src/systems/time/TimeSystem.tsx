import { useMemo, useRef } from "react";
import * as THREE from "three";
import { useFrame, useThree } from "@react-three/fiber";
import { useWorldStore } from "../../store/worldStore";
import { timeManager } from "./TimeManager";
import { computeSun, computeAtmosphere } from "./timeLogic";
import { setFog, setSun, setAmbient } from "../../shaders/atmosphere";

const tmp = new THREE.Color();
const tmp2 = new THREE.Color();

export function TimeSystem() {
  const sunRef = useRef<THREE.DirectionalLight>(null);
  const moonRef = useRef<THREE.DirectionalLight>(null);
  const sunBall = useRef<THREE.Mesh>(null);
  const moonBall = useRef<THREE.Mesh>(null);
  const starsRef = useRef<THREE.Points>(null);
  const scene = useThree((s) => s.scene);
  const camera = useThree((s) => s.camera);

  const starPositions = useMemo(() => {
    const count = 900;
    const arr = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      const u = Math.random() * 2 - 1;
      const a = Math.random() * Math.PI * 2;
      const r = Math.sqrt(1 - u * u);
      const radius = 520 + Math.random() * 60;
      arr[i * 3] = r * Math.cos(a) * radius;
      arr[i * 3 + 1] = u * radius;
      arr[i * 3 + 2] = r * Math.sin(a) * radius;
    }
    return arr;
  }, []);

  useFrame((_, rawDelta) => {
    const dt = Math.min(rawDelta, 0.05);
    const d = timeManager.getNow();

    const hour = d.getHours() + d.getMinutes() / 60 + d.getSeconds() / 3600;
    const { dirX, dirY, dirZ, dayFactor, duskFactor } = computeSun(hour);
    const sunDir = new THREE.Vector3(dirX, dirY, dirZ);

    const weather = useWorldStore.getState().weather;
    const atm = computeAtmosphere(hour, weather);

    setSun(sunDir, tmp.setRGB(atm.sunR, atm.sunG, atm.sunB), atm.sunIntensity);
    setAmbient(tmp2.setRGB(atm.ambR, atm.ambG, atm.ambB));

    const fogColor = tmp.setRGB(atm.fogR, atm.fogG, atm.fogB);
    setFog(fogColor, atm.fogDensity);
    const sceneFog = scene.fog as THREE.FogExp2 | null;
    if (sceneFog) {
      sceneFog.color.copy(fogColor);
      sceneFog.density = atm.fogDensity;
    }
    if (scene.background) (scene.background as THREE.Color).setRGB(atm.skyR, atm.skyG, atm.skyB);

    if (sunRef.current) {
      sunRef.current.position.copy(sunDir).multiplyScalar(320);
      sunRef.current.intensity = atm.sunIntensity / 2.4;
      sunRef.current.color.setRGB(atm.sunR, atm.sunG, atm.sunB);
    }
    if (moonRef.current) {
      const moonFactor = 1 - dayFactor;
      moonRef.current.position.copy(sunDir).multiplyScalar(-320);
      moonRef.current.intensity = moonFactor * 0.35;
      moonRef.current.color.setRGB(0.616, 0.706, 1);
    }

    const sunPos = camera.position.clone().add(sunDir.clone().multiplyScalar(420));
    if (sunBall.current) sunBall.current.position.copy(sunPos);
    const moonPos = camera.position.clone().add(sunDir.clone().multiplyScalar(-420));
    if (moonBall.current) moonBall.current.position.copy(moonPos);

    if (starsRef.current) {
      const m = starsRef.current.material as THREE.PointsMaterial;
      m.opacity = THREE.MathUtils.damp(m.opacity, atm.starsOpacity, 2, dt);
    }
  });

  return (
    <>
      <fogExp2 attach="fog" args={["#d7e3d6", 0.0005]} />
      <directionalLight
        ref={sunRef}
        castShadow
        position={[120, 260, 80]}
        intensity={1.6}
        shadow-mapSize={[2048, 2048]}
        shadow-camera-left={-160}
        shadow-camera-right={160}
        shadow-camera-top={160}
        shadow-camera-bottom={-160}
        shadow-camera-near={30}
        shadow-camera-far={800}
        shadow-bias={-0.0004}
      />
      <directionalLight ref={moonRef} position={[-120, 120, -80]} intensity={0} color="#9db4ff" />
      <hemisphereLight args={["#d9e8f2", "#4a6642", 0.65]} />
      <ambientLight intensity={0.32} color="#dfe8e0" />
      <mesh ref={sunBall}>
        <sphereGeometry args={[26, 24, 24]} />
        <meshBasicMaterial color="#ffe9a8" fog={false} />
      </mesh>
      <mesh ref={moonBall}>
        <sphereGeometry args={[16, 20, 20]} />
        <meshBasicMaterial color="#d8e2f2" fog={false} />
      </mesh>
      <points ref={starsRef} frustumCulled={false}>
        <bufferGeometry>
          <bufferAttribute attach="attributes-position" args={[starPositions, 3]} />
        </bufferGeometry>
        <pointsMaterial
          color="#dfe8ff"
          size={1.5}
          sizeAttenuation
          transparent
          opacity={0}
          depthWrite={false}
          fog={false}
        />
      </points>
    </>
  );
}
