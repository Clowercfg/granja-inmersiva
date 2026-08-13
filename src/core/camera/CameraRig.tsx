import { useEffect, useRef } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import * as THREE from "three";
import { useCameraStore } from "../../store/cameraStore";
import { useInteriorStore } from "../../store/interiorStore";
import { CAMERA, WORLD } from "../../config/world";
import { clamp, damp } from "../../utils/math";
import { terrainHeight } from "../../utils/terrain";
const keys = ["KeyW", "KeyA", "KeyS", "KeyD", "ShiftLeft", "ShiftRight"];

export function CameraRig() {
  const camera = useThree((s) => s.camera);
  const gl = useThree((s) => s.gl);

  const current = useRef<{
    target: THREE.Vector3;
    yaw: number;
    pitch: number;
    distance: number;
  }>({
    target: new THREE.Vector3(0, 0, -20),
    yaw: 0,
    pitch: CAMERA.pitchDefault,
    distance: CAMERA.distanceDefault,
  });

  const activeKeys = useRef<Set<string>>(new Set());
  const dragState = useRef({ down: false, x: 0, y: 0 });
  const panVel = useRef({ x: 0, z: 0 });
  const zoomVel = useRef(0);

  useEffect(() => {
    const el = gl.domElement;

    const onKeyDown = (e: KeyboardEvent) => {
      if (keys.includes(e.code)) {
        activeKeys.current.add(e.code);
        if (e.code === "ShiftLeft" || e.code === "ShiftRight") e.preventDefault();
      }
    };
    const onKeyUp = (e: KeyboardEvent) => activeKeys.current.delete(e.code);
    const onBlur = () => activeKeys.current.clear();

    const onContextMenu = (e: Event) => e.preventDefault();

    const onPointerDown = (e: PointerEvent) => {
      if (e.button === 0) {
        dragState.current = { down: true, x: e.clientX, y: e.clientY };
      }
    };
    const onPointerMove = (e: PointerEvent) => {
      const st = useCameraStore.getState();
      if (dragState.current.down) {
        const dx = e.clientX - dragState.current.x;
        const dy = e.clientY - dragState.current.y;
        dragState.current.x = e.clientX;
        dragState.current.y = e.clientY;
        st.setYaw(st.yaw - dx * CAMERA.rotateSpeed);
        st.setPitch(clamp(st.pitch + dy * CAMERA.rotateSpeed, CAMERA.pitchMin, CAMERA.pitchMax));
      }
    };
    const onPointerUp = (e: PointerEvent) => {
      if (e.button === 0) dragState.current.down = false;
    };

    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      zoomVel.current += Math.sign(e.deltaY) * CAMERA.zoomSpeed;
    };

    window.addEventListener("keydown", onKeyDown);
    window.addEventListener("keyup", onKeyUp);
    window.addEventListener("blur", onBlur);
    el.addEventListener("contextmenu", onContextMenu);
    el.addEventListener("pointerdown", onPointerDown);
    window.addEventListener("pointermove", onPointerMove);
    window.addEventListener("pointerup", onPointerUp);
    el.addEventListener("wheel", onWheel, { passive: false });

    return () => {
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("keyup", onKeyUp);
      window.removeEventListener("blur", onBlur);
      el.removeEventListener("contextmenu", onContextMenu);
      el.removeEventListener("pointerdown", onPointerDown);
      window.removeEventListener("pointermove", onPointerMove);
      window.removeEventListener("pointerup", onPointerUp);
      el.removeEventListener("wheel", onWheel);
    };
  }, [gl]);

  useFrame((_, rawDelta) => {
    if (useInteriorStore.getState().phase !== "idle") return;
    const dt = Math.min(rawDelta, 0.05);
    const goal = useCameraStore.getState();

    const boost = activeKeys.current.has("ShiftLeft") || activeKeys.current.has("ShiftRight") ? CAMERA.panSpeedBoost : 1;
    let panX = 0;
    let panZ = 0;
    if (activeKeys.current.has("KeyW")) panZ += 1;
    if (activeKeys.current.has("KeyS")) panZ -= 1;
    if (activeKeys.current.has("KeyD")) panX += 1;
    if (activeKeys.current.has("KeyA")) panX -= 1;

    const forwardX = Math.sin(goal.yaw);
    const forwardZ = Math.cos(goal.yaw);
    const rightX = Math.cos(goal.yaw);
    const rightZ = -Math.sin(goal.yaw);

    const speed = CAMERA.panSpeed * boost * dt;
    const tx = (forwardX * panZ + rightX * panX) * speed;
    const tz = (forwardZ * panZ + rightZ * panX) * speed;

    panVel.current.x = THREE.MathUtils.damp(panVel.current.x, tx, 12, dt);
    panVel.current.z = THREE.MathUtils.damp(panVel.current.z, tz, 12, dt);

    goal.nudgeTarget(panVel.current.x, panVel.current.z);

    const c = current.current;

    c.yaw = damp(c.yaw, goal.yaw, CAMERA.damping, dt);
    c.pitch = damp(c.pitch, goal.pitch, CAMERA.damping, dt);
    c.distance = damp(c.distance, clamp(goal.distance + zoomVel.current * 60, CAMERA.distanceMin, CAMERA.distanceMax), CAMERA.damping, dt);
    zoomVel.current = 0;

    const limit = WORLD.half - 15;
    const gx = clamp(goal.target[0], -limit, limit);
    const gz = clamp(goal.target[2], -limit, limit);
    const gy = terrainHeight(gx, gz) + 1;
    c.target.lerp(new THREE.Vector3(gx, gy, gz), 1 - Math.exp(-CAMERA.damping * dt));

    const cosPitch = Math.cos(c.pitch);
    const camX = c.target.x + c.distance * cosPitch * Math.sin(c.yaw);
    const camY = c.target.y + c.distance * Math.sin(c.pitch);
    const camZ = c.target.z + c.distance * cosPitch * Math.cos(c.yaw);

    const minH = terrainHeight(camX, camZ) + CAMERA.minHeightAboveTerrain;
    const finalY = Math.max(camY, minH);

    camera.position.set(camX, finalY, camZ);
    camera.lookAt(c.target);
  });

  return null;
}
