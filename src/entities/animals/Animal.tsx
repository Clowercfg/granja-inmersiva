import { useMemo, useRef } from "react";
import * as THREE from "three";
import { useFrame } from "@react-three/fiber";
import { animalRegistry } from "../../store/farmStore";
import { buildCow } from "./cow";
import { buildChicken } from "./chicken";
import { useSelectionStore } from "../../store/selectionStore";
import { SelectionRing } from "../common/SelectionRing";
import { clamp } from "../../utils/math";

export function Animal({ id }: { id: number }) {
  const agent = animalRegistry.get(id);
  const groupRef = useRef<THREE.Group>(null);

  const model = useMemo(() => {
    if (!agent) return null;
    return agent.kind === "cow" ? buildCow() : buildChicken();
  }, [agent?.kind]);

  const select = useSelectionStore((s) => s.select);
  const setHover = useSelectionStore((s) => s.setHover);
  const selected = useSelectionStore((s) => s.selected?.uid === `animal-${id}`);
  const hovered = useSelectionStore((s) => s.hovered?.uid === `animal-${id}`);

  useFrame((state, delta) => {
    const group = groupRef.current;
    if (!group || !agent) return;
    const dt = Math.min(delta, 0.05);
    const time = state.clock.elapsedTime;

    group.position.set(agent.position[0], agent.position[1], agent.position[2]);
    group.rotation.y = agent.rotation;
    group.scale.setScalar(agent.scale);

    const parts = (model as THREE.Group & { userData: { parts: unknown } }).userData.parts as {
      body: THREE.Mesh;
      head: THREE.Group;
      tail: THREE.Group;
      wings?: THREE.Mesh[];
      legs: THREE.Group[];
      phaseOffset: number[];
    };

    const speed = Math.hypot(agent.velocity[0], agent.velocity[2]);
    const moving = speed > 0.2;
    const amp = clamp(speed / agent.speed, 0, 1) * (moving ? 1 : 0);

    parts.legs.forEach((leg, i) => {
      const phase = agent.walkPhase + parts.phaseOffset[i];
      leg.rotation.x = Math.sin(phase) * 0.6 * amp;
    });

    if (agent.kind === "cow") {
      const sleeping = agent.state === "sleep";
      const eating = agent.state === "eating";
      const baseY = sleeping ? 0.5 : 0.62;
      parts.body.position.y = baseY + Math.abs(Math.sin(agent.walkPhase * 2)) * 0.035 * amp;
      parts.body.rotation.z = Math.sin(agent.walkPhase) * 0.02 * amp;
      parts.body.rotation.x = sleeping ? -0.12 : 0;
      parts.head.rotation.x = eating ? 0.55 : sleeping ? 0.9 : Math.sin(agent.walkPhase * 2) * 0.05 * amp;
      parts.head.position.y = (eating ? -0.06 : sleeping ? -0.3 : 0) + Math.sin(agent.walkPhase * 2) * 0.02 * amp;
      parts.tail.rotation.x = sleeping ? 0.5 : Math.sin(time * 1.7 + agent.idlePhase * 3) * 0.22;
      parts.tail.rotation.z = Math.sin(time * 0.9 + agent.idlePhase) * 0.1;
      parts.body.scale.y = 1 + Math.sin(time * 1.2 + agent.idlePhase * 4) * 0.008;
      const mood = agent.mood;
      parts.body.rotation.z += (1 - mood) * 0.02;
    } else {
      const sleeping = agent.state === "sleep";
      const eating = agent.state === "eating";
      parts.body.position.y = (sleeping ? 0.28 : 0.42) + Math.abs(Math.sin(agent.walkPhase * 2)) * 0.03 * amp;
      parts.body.rotation.x = sleeping ? -0.15 : 0;
      parts.head.rotation.x = eating ? 0.5 : sleeping ? 0.95 : Math.sin(agent.walkPhase * 2) * 0.07 * amp;
      parts.head.position.y = sleeping ? -0.25 : 0;
      parts.tail.rotation.x = sleeping ? 0.6 : Math.sin(time * 2.2 + agent.idlePhase * 3) * 0.16;
      parts.wings?.forEach((wing, i) => {
        wing.rotation.z = (i === 0 ? -1 : 1) * (0.1 + amp * Math.sin(agent.walkPhase * 2) * 0.25);
      });
    }
  });

  if (!agent || !model) return null;

  return (
    <group ref={groupRef}>
      <primitive
        object={model}
        onClick={(e: { stopPropagation: () => void }) => {
          e.stopPropagation();
          select({
            kind: "animal",
            uid: `animal-${agent.id}`,
            title: agent.name,
            subtitle: agent.kind === "cow" ? "Vaca lechera" : "Gallina ponedora",
          });
        }}
        onPointerOver={(e: { stopPropagation: () => void }) => {
          e.stopPropagation();
          setHover({
            kind: "animal",
            uid: `animal-${agent.id}`,
            title: agent.name,
            subtitle: agent.kind === "cow" ? "Vaca lechera" : "Gallina ponedora",
          });
          document.body.style.cursor = "pointer";
        }}
        onPointerOut={() => {
          setHover(null);
          document.body.style.cursor = "default";
        }}
      />
      {selected && <SelectionRing position={[0, 0.3, 0]} />}
      {hovered && !selected && <SelectionRing position={[0, 0.3, 0]} color="#ffffff" pulse={false} />}
    </group>
  );
}
