import { useMemo, useRef } from "react";
import * as THREE from "three";
import { useFrame } from "@react-three/fiber";
import { animalRegistry } from "../../store/farmStore";
import { buildCow } from "./cow";
import { buildChicken } from "./chicken";
import { buildRooster } from "./rooster";
import { buildPig } from "./pig";
import { useSelectionStore } from "../../store/selectionStore";
import { useT } from "../../store/languageStore";
import { SelectionRing } from "../common/SelectionRing";
import { clamp } from "../../utils/math";
import { useAsset } from "../../core/assets/useAsset";
import { prepareAnimalModel, type AnimalPartsBase } from "../../core/assets/assetStore";
import type { AnimalKind } from "../../types";

const KIND_ASSET: Record<AnimalKind, string> = {
  cow: "animal:cow",
  chicken: "animal:chicken",
  rooster: "animal:chicken",
  pig: "animal:pig",
};

function buildKind(kind: AnimalKind): THREE.Object3D | null {
  switch (kind) {
    case "cow":
      return buildCow();
    case "rooster":
      return buildRooster();
    case "pig":
      return buildPig();
    default:
      return buildChicken();
  }
}

export function Animal({ id }: { id: number }) {
  const agent = animalRegistry.get(id);
  const groupRef = useRef<THREE.Group>(null);

  const asset = useAsset(agent ? KIND_ASSET[agent.kind] : "animal:chicken");

  const model = useMemo(() => {
    if (!agent) return null;
    const loaded = prepareAnimalModel(asset, agent.kind);
    return loaded ?? buildKind(agent.kind);
  }, [agent, asset]);

  const select = useSelectionStore((s) => s.select);
  const setHover = useSelectionStore((s) => s.setHover);
  const selected = useSelectionStore((s) => s.selected?.uid === `animal-${id}`);
  const hovered = useSelectionStore((s) => s.hovered?.uid === `animal-${id}`);
  const t = useT();
  const kindLabel = t(`kind.${agent?.kind ?? "chicken"}`);

  useFrame((state, delta) => {
    const group = groupRef.current;
    if (!group || !agent || !model) return;
    const dt = Math.min(delta, 0.05);
    const time = state.clock.elapsedTime;

    group.position.set(agent.position[0], agent.position[1], agent.position[2]);
    group.rotation.y = agent.rotation;
    group.scale.setScalar(agent.scale);

    const parts = (model as THREE.Object3D & { userData?: { parts?: AnimalPartsBase } }).userData?.parts;
    if (!parts) return;

    const speed = Math.hypot(agent.velocity[0], agent.velocity[2]);
    const moving = speed > 0.2;
    const amp = clamp(speed / agent.speed, 0, 1) * (moving ? 1 : 0);

    parts.legs.forEach((leg, i) => {
      const phase = agent.walkPhase + parts.phaseOffset[i];
      leg.rotation.x = Math.sin(phase) * 0.6 * amp;
    });

    const body = parts.body;
    const head = parts.head;
    const tail = parts.tail;
    if (!body || !head || !tail) return;

    if (agent.kind === "cow" || agent.kind === "pig") {
      const sleeping = agent.state === "sleep";
      const eating = agent.state === "eating";
      const baseY = sleeping ? 0.5 : 0.62;
      body.position.y = baseY + Math.abs(Math.sin(agent.walkPhase * 2)) * 0.035 * amp;
      body.rotation.z = Math.sin(agent.walkPhase) * 0.02 * amp;
      body.rotation.x = sleeping ? -0.12 : 0;
      head.rotation.x = eating ? 0.55 : sleeping ? 0.9 : Math.sin(agent.walkPhase * 2) * 0.05 * amp;
      head.position.y = (eating ? -0.06 : sleeping ? -0.3 : 0) + Math.sin(agent.walkPhase * 2) * 0.02 * amp;
      tail.rotation.x = sleeping ? 0.5 : Math.sin(time * 1.7 + agent.idlePhase * 3) * 0.22;
      tail.rotation.z = Math.sin(time * 0.9 + agent.idlePhase) * 0.1;
      body.scale.y = 1 + Math.sin(time * 1.2 + agent.idlePhase * 4) * 0.008;
      const mood = agent.mood;
      body.rotation.z += (1 - mood) * 0.02;
    } else {
      const sleeping = agent.state === "sleep";
      const eating = agent.state === "eating";
      body.position.y = (sleeping ? 0.28 : 0.42) + Math.abs(Math.sin(agent.walkPhase * 2)) * 0.03 * amp;
      body.rotation.x = sleeping ? -0.15 : 0;
      head.rotation.x = eating ? 0.5 : sleeping ? 0.95 : Math.sin(agent.walkPhase * 2) * 0.07 * amp;
      head.position.y = sleeping ? -0.25 : 0;
      tail.rotation.x = sleeping ? 0.6 : Math.sin(time * 2.2 + agent.idlePhase * 3) * 0.16;
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
            subtitle: kindLabel,
          });
        }}
        onPointerOver={(e: { stopPropagation: () => void }) => {
          e.stopPropagation();
          setHover({
            kind: "animal",
            uid: `animal-${agent.id}`,
            title: agent.name,
            subtitle: kindLabel,
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
