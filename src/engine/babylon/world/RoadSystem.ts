import {
  Scene,
  Engine,
  MeshBuilder,
  PBRMaterial,
  Color3,
  Vector3,
  Mesh,
  VertexData,
} from "@babylonjs/core";
import type { ShadowGenerator } from "@babylonjs/core";
import type { BabylonSystem } from "../core/BabylonLifecycle";
import { PATHS, PATH_WIDTH, terrainHeight } from "./terrainMath";

const HALF_W = PATH_WIDTH / 2;
const SEG_RES = 3;        // subdivisions per segment for extra vertices

/** Build the path ribbon for a single waypoint chain. */
function buildPathMesh(
  name: string,
  chain: { x: number; z: number }[],
  scene: Scene,
): Mesh | null {
  if (chain.length < 2) return null;

  const left: Vector3[] = [];
  const right: Vector3[] = [];

  for (let i = 0; i < chain.length; i++) {
    const p = chain[i];
    let nx: number;
    let nz: number;

    if (i === 0) {
      const next = chain[1];
      const dx = next.x - p.x;
      const dz = next.z - p.z;
      const len = Math.hypot(dx, dz);
      nx = -dz / len;
      nz = dx / len;
    } else if (i === chain.length - 1) {
      const prev = chain[i - 1];
      const dx = p.x - prev.x;
      const dz = p.z - prev.z;
      const len = Math.hypot(dx, dz);
      nx = -dz / len;
      nz = dx / len;
    } else {
      const prev = chain[i - 1];
      const next = chain[i + 1];
      const dx = next.x - prev.x;
      const dz = next.z - prev.z;
      const len = Math.hypot(dx, dz);
      nx = -dz / len;
      nz = dx / len;
    }

    const y = terrainHeight(p.x, p.z) + 0.03;
    left.push(new Vector3(p.x + nx * HALF_W, y, p.z + nz * HALF_W));
    right.push(new Vector3(p.x - nx * HALF_W, y, p.z - nz * HALF_W));
  }

  const ribbon = MeshBuilder.CreateRibbon(
    name,
    {
      pathArray: [left, right],
      sideOrientation: Mesh.DOUBLESIDE,
      updatable: false,
    },
    scene,
  );

  return ribbon;
}

export class RoadSystem implements BabylonSystem {
  private meshes: Mesh[] = [];
  private mat: PBRMaterial | null = null;

  init(scene: Scene, _engine: Engine): void {
    const shadows = (scene as any)._shadowGenerator as ShadowGenerator | undefined;

    this.mat = new PBRMaterial("pathMat", scene);
    this.mat.albedoColor = new Color3(0.55, 0.44, 0.28);
    this.mat.roughness = 0.98;
    this.mat.metallic = 0;

    for (let ci = 0; ci < PATHS.length; ci++) {
      const mesh = buildPathMesh(`path_${ci}`, PATHS[ci], scene);
      if (!mesh) continue;
      mesh.material = this.mat;
      mesh.receiveShadows = true;
      if (shadows) {
        shadows.addShadowCaster(mesh);
      }
      this.meshes.push(mesh);
    }
  }

  dispose(): void {
    for (const m of this.meshes) m.dispose();
    this.meshes.length = 0;
    this.mat?.dispose();
  }
}
