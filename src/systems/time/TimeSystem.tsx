import { useMemo, useRef } from "react";
import * as THREE from "three";
import { useFrame, useThree } from "@react-three/fiber";
import { useWorldStore } from "../../store/worldStore";
import { timeManager } from "./TimeManager";
import { atmosphere, setFog, setSun, setAmbient, tickAtmosphere } from "../../shaders/atmosphere";

const sunColDay = new THREE.Color("#fff3dd");
const sunColDusk = new THREE.Color("#ffb36b");
const sunColCloudy = new THREE.Color("#e6ebf2");
const moonCol = new THREE.Color("#9db4ff");

const skyDay = new THREE.Color("#a9cfe6");
const skyDusk = new THREE.Color("#f0c9a0");
const skyNight = new THREE.Color("#0b1622");
const skyCloudy = new THREE.Color("#b8c4cc");

const fogDay = new THREE.Color("#d7e3d6");
const fogDusk = new THREE.Color("#d9c2a2");
const fogNight = new THREE.Color("#101a24");
const fogCloudy = new THREE.Color("#aebbbf");

const ambDay = new THREE.Color("#e9f0ea");
const ambNight = new THREE.Color("#1c2836");

const tmp = new THREE.Color();
const tmp2 = new THREE.Color();

function mixColor(out: THREE.Color, a: THREE.Color, b: THREE.Color, t: number): THREE.Color {
  return out.copy(a).lerp(b, t);
}

/** Calcula la posición del sol a partir de la hora real (6h amanecer, 12h cenit, 18h atardecer). */
function sunFromHour(hour: number): { dir: THREE.Vector3; dayFactor: number; duskFactor: number } {
  const t = hour / 24;
  const phi = (t - 0.25) * Math.PI * 2;
  const elev = Math.sin(phi);
  const horizon = Math.sqrt(Math.max(0, 1 - elev * elev));

  const dir = new THREE.Vector3(Math.cos(phi) * horizon, elev, Math.sin(phi) * horizon);
  if (dir.lengthSq() < 1e-6) dir.set(0, 1, 0);
  dir.normalize();

  const dayFactor = THREE.MathUtils.clamp(elev * 1.4 + 0.15, 0, 1);
  const duskFactor = THREE.MathUtils.clamp(1 - Math.abs(elev) * 6, 0, 1) * dayFactor;
  return { dir, dayFactor, duskFactor };
}

export function TimeSystem() {
  const sunRef = useRef<THREE.DirectionalLight>(null);
  const moonRef = useRef<THREE.DirectionalLight>(null);
  const sunBall = useRef<THREE.Mesh>(null);
  const moonBall = useRef<THREE.Mesh>(null);
  const starsRef = useRef<THREE.Points>(null);
  const scene = useThree((s) => s.scene);
  const camera = useThree((s) => s.camera);
  const lastSync = useRef(0);

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
    timeManager.tick(dt);
    tickAtmosphere(dt);

    const d = timeManager.getNow();

    // El reloj se refleja en React como mucho 1 vez por segundo.
    const now = Date.now();
    if (now - lastSync.current >= 1000) {
      lastSync.current = now;
      useWorldStore.getState().syncClock(d);
    }

    const hour = d.getHours() + d.getMinutes() / 60 + d.getSeconds() / 3600;
    const { dir: sunDir, dayFactor, duskFactor } = sunFromHour(hour);

    const weather = useWorldStore.getState().weather;
    const weatherDim = weather === "clear" ? 1 : weather === "cloudy" ? 0.55 : 0.35;
    const weatherFog = weather === "clear" ? 1 : weather === "cloudy" ? 1.8 : 2.6;

    const sunIntensity = Math.max(0.05, Math.pow(dayFactor, 1.3)) * weatherDim;
    const sunColor = mixColor(tmp, sunColDay, sunColDusk, duskFactor);
    if (weather !== "clear") sunColor.lerp(sunColCloudy, weather === "cloudy" ? 0.5 : 0.72);

    const skyColor = mixColor(tmp2, skyDay, skyNight, 1 - dayFactor);
    if (duskFactor > 0.05) skyColor.lerp(skyDusk, duskFactor * 0.9);
    if (weather !== "clear") skyColor.lerp(skyCloudy, weather === "cloudy" ? 0.6 : 0.8);

    setSun(sunDir, sunColor, sunIntensity * 2.4);
    setAmbient(mixColor(tmp2, ambDay, ambNight, 1 - dayFactor));

    const fogColor = mixColor(tmp, fogDay, fogNight, 1 - dayFactor);
    if (duskFactor > 0.05) fogColor.lerp(fogDusk, duskFactor * 0.8);
    if (weather !== "clear") fogColor.lerp(fogCloudy, weather === "cloudy" ? 0.55 : 0.8);
    const fogDensity = 0.00045 * weatherFog + (1 - dayFactor) * 0.00025;

    setFog(fogColor, fogDensity);
    const sceneFog = scene.fog as THREE.FogExp2 | null;
    if (sceneFog) {
      sceneFog.color.copy(fogColor);
      sceneFog.density = fogDensity;
    }
    if (scene.background) (scene.background as THREE.Color).copy(skyColor);

    if (sunRef.current) {
      sunRef.current.position.copy(sunDir).multiplyScalar(320);
      sunRef.current.intensity = sunIntensity;
      sunRef.current.color.copy(sunColor);
    }
    if (moonRef.current) {
      const moonFactor = 1 - dayFactor;
      moonRef.current.position.copy(sunDir).multiplyScalar(-320);
      moonRef.current.intensity = moonFactor * 0.35;
      moonRef.current.color.copy(moonCol);
    }

    const sunPos = camera.position.clone().add(sunDir.clone().multiplyScalar(420));
    if (sunBall.current) sunBall.current.position.copy(sunPos);
    const moonPos = camera.position.clone().add(sunDir.clone().multiplyScalar(-420));
    if (moonBall.current) moonBall.current.position.copy(moonPos);

    if (starsRef.current) {
      const m = starsRef.current.material as THREE.PointsMaterial;
      const target = Math.pow(1 - dayFactor, 1.6);
      m.opacity = THREE.MathUtils.damp(m.opacity, target, 2, dt);
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
      <directionalLight ref={moonRef} position={[-120, 120, -80]} intensity={0} color={moonCol} />
      <hemisphereLight args={["#d9e8f2", "#3c5a3a", 0.55]} />
      <ambientLight intensity={0.25} color="#dfe8e0" />
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
