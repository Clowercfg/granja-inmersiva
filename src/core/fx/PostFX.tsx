import { EffectComposer, Bloom, Vignette } from "@react-three/postprocessing";
import * as THREE from "three";
import { useWorldStore } from "../../store/worldStore";
import { mark } from "../../core/bootMetrics";

export function PostFX() {
  const mode = useWorldStore((s) => s.rendererMode);
  const booted = useWorldStore((s) => s.booted);
  if (!booted || mode !== "webgl") return null;
  mark("postfx_mounted");
  return (
    <EffectComposer multisampling={0} frameBufferType={THREE.UnsignedByteType}>
      <Bloom intensity={0.5} luminanceThreshold={0.85} luminanceSmoothing={0.2} mipmapBlur />
      <Vignette offset={0.24} darkness={0.5} eskil={false} />
    </EffectComposer>
  );
}
