import { useEffect, useRef } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import * as THREE from "three";
import { useInteriorStore } from "../../store/interiorStore";
import { useCameraStore } from "../../store/cameraStore";
import { useStorageStore } from "../../store/storageStore";
import { CAMERA } from "../../config/world";
import { getInteriorDef, localToWorld } from "../../config/interiors";
import { itemLocalPos, itemShelf } from "./storageLayout";

const EXPOSURE_INSIDE = 1.35;
const EXPOSURE_OUTSIDE = 1.05;
const WALL_MARGIN = 0.35;
const FLOOR_Y = 0.3;

function easeInOutCubic(t: number): number {
  return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
}

const drag = { down: false, x: 0, y: 0 };
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
  const focusFlight = useRef({ key: "", start: 0, from: new THREE.Vector3() });
  const exitFlight = useRef({ active: false, start: 0, from: new THREE.Vector3(), to: new THREE.Vector3() });
  const insideInit = useRef(false);

  useEffect(() => {
    const el = gl.domElement;
    const onPointerDown = (e: PointerEvent) => {
      if (e.button === 0) {
        drag.down = true;
        drag.x = e.clientX;
        drag.y = e.clientY;
      }
    };
    const onPointerMove = (e: PointerEvent) => {
      if (!drag.down || useInteriorStore.getState().phase !== "inside") return;
      const dx = e.clientX - drag.x;
      const dy = e.clientY - drag.y;
      drag.x = e.clientX;
      drag.y = e.clientY;
      const o = orbit.current;
      o.yaw -= dx * CAMERA.rotateSpeed;
      o.pitch = THREE.MathUtils.clamp(o.pitch + dy * CAMERA.rotateSpeed, -0.9, 1.35);
    };
    const onPointerUp = (e: PointerEvent) => {
      if (e.button === 0) drag.down = false;
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
      const focus = useStorageStore.getState().focus;
      if (focus) {
        const uid = store.activeUid;
        if (!uid) return;
        const shelf = itemShelf(focus.id);
        if (!shelf) return;
        const crateLocal = itemLocalPos(focus.id, focus.crateIndex);
        const worldPos = localToWorld(uid, [crateLocal.x, crateLocal.y, crateLocal.z]);
        if (!worldPos) return;
        const f = focusFlight.current;
        const key = `${focus.id}:${focus.crateIndex}`;
        if (f.key !== key) {
          f.key = key;
          f.start = performance.now();
          f.from.copy(camera.position);
        }
        const t = Math.min(1, (performance.now() - f.start) / 800);
        const e = easeInOutCubic(t);
        const swing = Math.sin(performance.now() * 0.0011) * 0.22 * e;
        const cosA = Math.cos(swing);
        const sinA = Math.sin(swing);
        const camLocal = new THREE.Vector3(
          crateLocal.x + 1.05 * sinA,
          crateLocal.y + 0.45,
          crateLocal.z + 1.05 * cosA * shelf.facing
        );
        const camWorld = localToWorld(uid, [camLocal.x, camLocal.y, camLocal.z]);
        if (camWorld) {
          camera.position.lerpVectors(f.from, camWorld, e);
          camera.lookAt(worldPos);
        }
        return;
      }
      const wasFocused = focusFlight.current.key !== "";
      focusFlight.current.key = "";

      if (!insideInit.current) return;
      const o = orbit.current;
      const cosPitch = Math.cos(o.pitch);
      const sinPitch = Math.sin(o.pitch);
      const sinYaw = Math.sin(o.yaw);
      const cosYaw = Math.cos(o.yaw);
      let minDist = 2;
      let maxDist = 9;
      const halfW = def.size[0] / 2 - WALL_MARGIN;
      const halfD = def.size[2] / 2 - WALL_MARGIN;
      const halfH = def.size[1] - WALL_MARGIN;
      if (Math.abs(sinYaw) > 1e-3) {
        maxDist = Math.min(maxDist, (halfW - Math.abs(o.target.x)) / (cosPitch * Math.abs(sinYaw)));
      }
      if (Math.abs(cosYaw) > 1e-3) {
        maxDist = Math.min(maxDist, (halfD - Math.abs(o.target.z)) / (cosPitch * Math.abs(cosYaw)));
      }
      if (sinPitch > 1e-3) {
        maxDist = Math.min(maxDist, (halfH - o.target.y) / sinPitch);
      } else if (sinPitch < -1e-3) {
        maxDist = Math.min(maxDist, (FLOOR_Y - o.target.y) / sinPitch);
      }
      minDist = Math.min(minDist, maxDist);
      o.dist = THREE.MathUtils.clamp(o.dist + zoomVel, Math.max(0.5, minDist), Math.max(1, maxDist));
      zoomVel = 0;
      const camX = o.target.x + o.dist * cosPitch * sinYaw;
      const camY = o.target.y + o.dist * sinPitch;
      const camZ = o.target.z + o.dist * cosPitch * cosYaw;

      if (wasFocused) {
        exitFlight.current = {
          active: true,
          start: performance.now(),
          from: camera.position.clone(),
          to: new THREE.Vector3(camX, camY, camZ),
        };
      }
      if (exitFlight.current.active) {
        const t = THREE.MathUtils.clamp((performance.now() - exitFlight.current.start) / 500, 0, 1);
        const e = easeInOutCubic(t);
        camera.position.lerpVectors(exitFlight.current.from, exitFlight.current.to, e);
        camera.lookAt(o.target);
        if (t >= 1) exitFlight.current.active = false;
        return;
      }
      camera.position.set(camX, camY, camZ);
      camera.lookAt(o.target);
      return;
    }
  });

  return null;
}
