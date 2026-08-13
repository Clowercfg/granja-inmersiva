import { useEffect, useRef } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import * as THREE from "three";
import { useInteriorStore } from "../../store/interiorStore";
import { useCameraStore } from "../../store/cameraStore";
import { CAMERA } from "../../config/world";
import { getInteriorDef, localToWorld } from "../../config/interiors";

const EXPOSURE_INSIDE = 1.35;
const EXPOSURE_OUTSIDE = 1.05;

function easeInOutCubic(t: number): number {
  return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
}

const right = { down: false, x: 0, y: 0 };
let zoomVel = 0;

export function InteriorCamera() {
  const camera = useThree((s) => s.camera);
  const gl = useThree((s) => s.gl);
  const phase = useInteriorStore((s) => s.phase);

  const flight = useRef({
    start: 0,
    from: new THREE.Vector3(),
    to: new THREE.Vector3(),
    lookFrom: new THREE.Vector3(),
    lookTo: new THREE.Vector3(),
  });
  const captured = useRef(false);
  const savedPos = useRef(new THREE.Vector3());
  const savedTgt = useRef(new THREE.Vector3());
  const orbit = useRef({ yaw: 0, pitch: 0.5, dist: 7.5, target: new THREE.Vector3() });
  const insideInit = useRef(false);

  useEffect(() => {
    const el = gl.domElement;
    const onPointerDown = (e: PointerEvent) => {
      if (e.button === 2) {
        right.down = true;
        right.x = e.clientX;
        right.y = e.clientY;
      }
    };
    const onPointerMove = (e: PointerEvent) => {
      if (!right.down || useInteriorStore.getState().phase !== "inside") return;
      const dx = e.clientX - right.x;
      const dy = e.clientY - right.y;
      right.x = e.clientX;
      right.y = e.clientY;
      const o = orbit.current;
      o.yaw -= dx * CAMERA.rotateSpeed;
      o.pitch = THREE.MathUtils.clamp(o.pitch + dy * CAMERA.rotateSpeed, 0.08, 1.35);
    };
    const onPointerUp = (e: PointerEvent) => {
      if (e.button === 2) right.down = false;
    };
    const onWheel = (e: WheelEvent) => {
      if (useInteriorStore.getState().phase !== "inside") return;
      e.preventDefault();
      zoomVel += Math.sign(e.deltaY) * 0.25;
    };
    el.addEventListener("pointerdown", onPointerDown);
    window.addEventListener("pointermove", onPointerMove);
    window.addEventListener("pointerup", onPointerUp);
    el.addEventListener("wheel", onWheel, { passive: false });
    return () => {
      el.removeEventListener("pointerdown", onPointerDown);
      window.removeEventListener("pointermove", onPointerMove);
      window.removeEventListener("pointerup", onPointerUp);
      el.removeEventListener("wheel", onWheel);
    };
  }, [gl]);

  useEffect(() => {
    const store = useInteriorStore.getState();
    const def = getInteriorDef(store.type);

    if (phase === "entering" && def && store.activeUid) {
      const cam = useCameraStore.getState();
      store.captureCamera({
        target: [...cam.target] as [number, number, number],
        yaw: cam.yaw,
        pitch: cam.pitch,
        distance: cam.distance,
      });
      savedPos.current.copy(camera.position);
      savedTgt.current.set(cam.target[0], cam.target[1], cam.target[2]);
      const end = localToWorld(store.activeUid, def.approach);
      const door = localToWorld(store.activeUid, def.door);
      if (!end || !door) return;
      flight.current = {
        start: performance.now(),
        from: camera.position.clone(),
        to: end,
        lookFrom: savedTgt.current.clone(),
        lookTo: door,
      };
      captured.current = true;
    }

    if (phase === "inside" && def && store.activeUid) {
      const tgt = localToWorld(store.activeUid, def.cameraLook);
      if (tgt) {
        orbit.current = {
          yaw: def.cameraYaw,
          pitch: def.cameraPitch,
          dist: def.cameraDistance,
          target: tgt,
        };
      }
      insideInit.current = true;
    }

    if (phase === "outside" && def && store.activeUid && captured.current) {
      const from = localToWorld(store.activeUid, def.approach);
      const door = localToWorld(store.activeUid, def.door);
      if (!from || !door) return;
      flight.current = {
        start: performance.now(),
        from,
        to: savedPos.current.clone(),
        lookFrom: door,
        lookTo: savedTgt.current.clone(),
      };
    }
  }, [phase, camera]);

  useEffect(() => {
    const r = gl as unknown as { toneMappingExposure?: number };
    r.toneMappingExposure = phase === "inside" ? EXPOSURE_INSIDE : EXPOSURE_OUTSIDE;
  }, [phase, gl]);

  useFrame(() => {
    const store = useInteriorStore.getState();
    const def = getInteriorDef(store.type);
    if (!store.activeUid || !def) return;

    if (store.phase === "entering") {
      const f = flight.current;
      const t = THREE.MathUtils.clamp((performance.now() - f.start) / (def.flightTime * 1000), 0, 1);
      const e = easeInOutCubic(t);
      const arc = Math.sin(Math.PI * t) * 0.9;
      camera.position.lerpVectors(f.from, f.to, e);
      camera.position.y += arc;
      const look = new THREE.Vector3().lerpVectors(f.lookFrom, f.lookTo, e);
      camera.lookAt(look);
      if (t >= 1) useInteriorStore.getState().finishApproach();
      return;
    }

    if (store.phase === "outside") {
      const f = flight.current;
      const t = THREE.MathUtils.clamp((performance.now() - f.start) / (def.flightTime * 1000), 0, 1);
      const e = easeInOutCubic(t);
      const arc = Math.sin(Math.PI * t) * 0.9;
      camera.position.lerpVectors(f.from, f.to, e);
      camera.position.y += arc;
      const look = new THREE.Vector3().lerpVectors(f.lookFrom, f.lookTo, e);
      camera.lookAt(look);
      if (t >= 1) {
        const saved = useInteriorStore.getState().savedCamera;
        if (saved) {
          useCameraStore.setState({
            target: saved.target,
            yaw: saved.yaw,
            pitch: saved.pitch,
            distance: saved.distance,
          });
        }
        useInteriorStore.getState().reset();
      }
      return;
    }

    if (store.phase === "inside") {
      if (!insideInit.current) return;
      const o = orbit.current;
      o.dist = THREE.MathUtils.clamp(o.dist + zoomVel, 2, 9);
      zoomVel = 0;
      const cosPitch = Math.cos(o.pitch);
      const camX = o.target.x + o.dist * cosPitch * Math.sin(o.yaw);
      const camY = o.target.y + o.dist * Math.sin(o.pitch);
      const camZ = o.target.z + o.dist * cosPitch * Math.cos(o.yaw);
      camera.position.set(camX, camY, camZ);
      camera.lookAt(o.target);
      return;
    }
  });

  return null;
}
