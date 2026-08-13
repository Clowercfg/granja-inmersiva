import { useEffect, useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { useWorldStore } from "../../store/worldStore";
import { useInteriorStore } from "../../store/interiorStore";
import type { WeatherKind } from "../../config/world";

const TRANSITIONS: Record<WeatherKind, WeatherKind[]> = {
  clear: ["clear", "clear", "cloudy"],
  cloudy: ["cloudy", "rain", "clear"],
  rain: ["clear", "cloudy"],
};

export function WeatherSystem() {
  const nextAt = useRef(Date.now() + 60000);
  const rng = useMemo(() => {
    let seed = (Date.now() ^ 0x9e3779b9) >>> 0;
    return () => {
      seed = (seed * 1664525 + 1013904223) >>> 0;
      return seed / 4294967296;
    };
  }, []);

  useEffect(() => {
    const interval = setInterval(() => {
      const now = Date.now();
      if (now < nextAt.current) return;
      nextAt.current = now + 70000 + rng() * 120000;
      const st = useWorldStore.getState();
      const options = TRANSITIONS[st.weather];
      const next = options[Math.floor(rng() * options.length)];
      if (next !== st.weather) {
        st.setWeather(next);
      }
    }, 2000);
    return () => clearInterval(interval);
  }, [rng]);

  return null;
}

const COUNT = 1600;
const RAIN_AREA = 130;
const RAIN_TOP = 70;
const RAIN_BOTTOM = -2;

export function Rain() {
  const points = useRef<THREE.Points>(null);
  const positions = useMemo(() => {
    const arr = new Float32Array(COUNT * 3);
    for (let i = 0; i < COUNT; i++) {
      arr[i * 3] = (Math.random() * 2 - 1) * RAIN_AREA;
      arr[i * 3 + 1] = RAIN_BOTTOM + Math.random() * RAIN_TOP;
      arr[i * 3 + 2] = (Math.random() * 2 - 1) * RAIN_AREA;
    }
    return arr;
  }, []);

  useFrame((state, rawDelta) => {
    const dt = Math.min(rawDelta, 0.05);
    const p = points.current;
    if (!p) return;
    p.visible = useInteriorStore.getState().phase === "idle";
    if (!p.visible) return;
    const pos = p.geometry.attributes.position as THREE.BufferAttribute;
    const cam = state.camera.position;
    const fall = 13 * dt;
    for (let i = 0; i < COUNT; i++) {
      let y = pos.array[i * 3 + 1] - fall;
      if (y < RAIN_BOTTOM) y = RAIN_TOP - (RAIN_BOTTOM - y);
      pos.array[i * 3 + 1] = y;
    }
    pos.needsUpdate = true;
    const wrap = RAIN_AREA / 2;
    let cx = cam.x;
    let cz = cam.z;
    if (cx > wrap) cx = wrap;
    if (cx < -wrap) cx = -wrap;
    if (cz > wrap) cz = wrap;
    if (cz < -wrap) cz = -wrap;
    p.position.x = cx;
    p.position.z = cz;
  });

  return (
    <points ref={points} frustumCulled={false}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" args={[positions, 3]} />
      </bufferGeometry>
      <pointsMaterial
        color="#9db8d8"
        size={0.11}
        transparent
        opacity={0.65}
        depthWrite={false}
        sizeAttenuation
      />
    </points>
  );
}
