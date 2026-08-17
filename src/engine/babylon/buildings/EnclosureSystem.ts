import {
  Scene,
  Engine,
  MeshBuilder,
  PBRMaterial,
  Color3,
  Vector3,
  Matrix,
  Quaternion,
  Mesh,
} from "@babylonjs/core";
import type { ShadowGenerator } from "@babylonjs/core";
import { ENCLOSURES, getEnclosureFences, type EnclosureDef } from "../../../config/enclosures";
import { terrainHeight } from "../world/terrainMath";
import type { BabylonSystem } from "../vegetation/TreeSystem";

const POST_HEIGHT = 1.8;
const POST_RADIUS = 0.07;
const RAIL_HEIGHT_TOP = 1.3;
const RAIL_HEIGHT_MID = 0.7;
const RAIL_THICKNESS = 0.06;
const RAIL_DEPTH = 0.05;
const FENCE_SPACING = 1.2;
const QY = (angle: number) => Quaternion.RotationAxis(Vector3.Up(), angle);

const POST_COLOR = new Color3(0.48, 0.36, 0.24);
const RAIL_COLOR = new Color3(0.52, 0.4, 0.28);

export class EnclosureSystem implements BabylonSystem {
  private scene!: Scene;
  private engine!: Engine;
  private postMat!: PBRMaterial;
  private railMat!: PBRMaterial;
  private disposed = false;

  init(scene: Scene, engine: Engine, shadows?: ShadowGenerator): void {
    this.scene = scene;
    this.engine = engine;

    this.postMat = new PBRMaterial("enclosurePostMat", scene);
    this.postMat.albedoColor = POST_COLOR;
    this.postMat.roughness = 0.95;
    this.postMat.metallic = 0;

    this.railMat = new PBRMaterial("enclosureRailMat", scene);
    this.railMat.albedoColor = RAIL_COLOR;
    this.railMat.roughness = 0.93;
    this.railMat.metallic = 0;

    const post = MeshBuilder.CreateCylinder(
      "encPostBase",
      { height: POST_HEIGHT, diameter: POST_RADIUS * 2, tessellation: 6 },
      scene,
    );
    post.material = this.postMat;
    post.isVisible = false;
    post.receiveShadows = true;

    for (const def of ENCLOSURES) {
      this.buildEnclosure(def, post, shadows);
    }
  }

  private buildEnclosure(
    def: EnclosureDef,
    postBase: Mesh,
    shadows?: ShadowGenerator,
  ): void {
    const fenceSegs = getEnclosureFences(def);

    for (const seg of fenceSegs) {
      const y = terrainHeight(seg.x, seg.z);
      const m = Matrix.Compose(
        Vector3.One(),
        Quaternion.Identity(),
        new Vector3(seg.x, y + POST_HEIGHT / 2, seg.z),
      );
      postBase.thinInstanceAdd(m);
    }

    const b = def.bounds;
    const edges: Array<{
      edge: "minX" | "maxX" | "minZ" | "maxZ";
      fixed: number;
      rot: number;
      alongX: boolean;
    }> = [
      { edge: "minZ", fixed: b.minZ, rot: 0, alongX: true },
      { edge: "maxZ", fixed: b.maxZ, rot: 0, alongX: true },
      { edge: "minX", fixed: b.minX, rot: Math.PI / 2, alongX: false },
      { edge: "maxX", fixed: b.maxX, rot: Math.PI / 2, alongX: false },
    ];

    const GATE_HALF = 2;

    for (const e of edges) {
      const lo = e.alongX ? b.minX : b.minZ;
      const hi = e.alongX ? b.maxX : b.maxZ;

      const ranges: Array<[number, number]> = [];
      if (def.gate.edge === e.edge) {
        const center = lo + def.gate.t * (hi - lo);
        ranges.push([lo, center - GATE_HALF], [center + GATE_HALF, hi]);
      } else {
        ranges.push([lo, hi]);
      }

      for (const [from, to] of ranges) {
        const span = to - from;
        if (span <= 0) continue;
        const n = Math.max(1, Math.ceil(span / FENCE_SPACING));
        const step = span / n;

        for (let i = 0; i < n; i++) {
          const center = from + (i + 0.5) * step;
          let px: number;
          let pz: number;
          if (e.alongX) {
            px = center;
            pz = e.fixed;
          } else {
            px = e.fixed;
            pz = center;
          }

          const y = terrainHeight(px, pz);

          const topRail = MeshBuilder.CreateBox(
            `rail_${def.id}_${e.edge}_${i}_t`,
            { width: step * 0.95, height: RAIL_THICKNESS, depth: RAIL_DEPTH },
            this.scene,
          );
          topRail.position.set(px, y + RAIL_HEIGHT_TOP, pz);
          topRail.rotation.y = e.rot;
          topRail.material = this.railMat;

          const midRail = MeshBuilder.CreateBox(
            `rail_${def.id}_${e.edge}_${i}_m`,
            { width: step * 0.95, height: RAIL_THICKNESS, depth: RAIL_DEPTH },
            this.scene,
          );
          midRail.position.set(px, y + RAIL_HEIGHT_MID, pz);
          midRail.rotation.y = e.rot;
          midRail.material = this.railMat;
        }
      }
    }

    if (shadows && postBase.thinInstanceCount > 0) {
      shadows.addShadowCaster(postBase);
    }
  }

  dispose(): void {
    if (this.disposed) return;
    this.disposed = true;
    this.postMat.dispose();
    this.railMat.dispose();
  }
}
