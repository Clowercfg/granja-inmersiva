import { useInteriorStore } from "../../store/interiorStore";
import { getBuildingTransform, getInteriorDef } from "../../config/interiors";
import { BarnInterior } from "./BarnInterior";

/** Mounts the active building interior on demand inside the shared world. */
export function InteriorGroup() {
  const phase = useInteriorStore((s) => s.phase);
  const type = useInteriorStore((s) => s.type);
  const activeUid = useInteriorStore((s) => s.activeUid);

  const mounted = phase === "fadeIn" || phase === "inside" || phase === "fadeOut";
  if (!mounted || !type || !activeUid) return null;

  const def = getInteriorDef(type);
  if (!def) return null;

  const t = getBuildingTransform(activeUid);
  if (!t) return null;

  return (
    <group position={[t.position[0], t.groundY, t.position[2]]} rotation={[0, t.rotation, 0]}>
      <BarnInterior def={def} />
    </group>
  );
}
