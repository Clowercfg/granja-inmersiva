import {
  Engine,
  Scene,
  Mesh,
  MeshBuilder,
  PBRMaterial,
  Color3,
  TransformNode,
  type ShadowGenerator,
} from "@babylonjs/core";
import type { BabylonSystem } from "../core/BabylonLifecycle";
import { PLOTS, terrainHeight, type PlotRect } from "../core/WorldConstants";
import { useCropStore, growthProgressOf } from "../../../store/cropStore";
import { CROP_TYPES, PLOT_CROPS } from "../../../config/crops";

interface CropMeshGroup {
  roots: TransformNode;
  soilMesh: Mesh;
  stems: Mesh[];
  heads: Mesh[];
}

const STEM_COLOR = new Color3(0.35, 0.55, 0.25);
const SOIL_COLOR = new Color3(0.36, 0.26, 0.15);
const READY_EMISSIVE = new Color3(0.15, 0.12, 0.02);

const CROP_COLOR_MAP: Record<string, { head: Color3; emissive?: Color3 }> = {
  wheat: { head: new Color3(0.85, 0.65, 0.12), emissive: new Color3(0.2, 0.15, 0.02) },
  carrot: { head: new Color3(1, 0.42, 0.2), emissive: new Color3(0.15, 0.06, 0.01) },
  potato: { head: new Color3(0.55, 0.45, 0.32), emissive: new Color3(0.08, 0.06, 0.03) },
};

export class CropSystem implements BabylonSystem {
  private _scene!: Scene;
  private _engine!: Engine;
  private _shadowGen?: ShadowGenerator;
  private _plotGroups: CropMeshGroup[] = [];
  private _observer?: number;

  init(scene: Scene, engine: Engine, shadows?: ShadowGenerator): void {
    this._scene = scene;
    this._engine = engine;
    this._shadowGen = shadows;
    this._createPlotMeshes();
  }

  update(_dt: number): void {
    const { planted } = useCropStore.getState();

    for (let i = 0; i < PLOTS.length; i++) {
      const group = this._plotGroups[i];
      if (!group) continue;

      const crop = planted.find((c) => c.plotIndex === i);

      if (crop) {
        const progress = growthProgressOf(crop);
        const cropDef = CROP_TYPES.find((ct) => ct.id === crop.cropId);
        const isReady = crop.state === "ready";

        group.soilMesh.setEnabled(true);
        group.roots.setEnabled(true);

        const stemScale = 0.05 + progress * 0.95;
        for (const stem of group.stems) {
          stem.scaling.set(1, stemScale, 1);
        }
        for (const head of group.heads) {
          const headScale = Math.max(0, (progress - 0.5) * 2);
          head.scaling.set(headScale, headScale, headScale);

          if (head.material instanceof PBRMaterial && isReady && cropDef) {
            const colors = CROP_COLOR_MAP[cropDef.id];
            if (colors?.emissive) {
              head.material.emissiveColor = colors.emissive;
            }
          } else if (head.material instanceof PBRMaterial && !isReady) {
            head.material.emissiveColor = Color3.Black();
          }
        }
      } else {
        group.soilMesh.setEnabled(true);
        group.roots.setEnabled(false);
      }
    }
  }

  dispose(): void {
    for (const group of this._plotGroups) {
      group.roots.dispose(false, true);
      group.soilMesh.dispose();
    }
    this._plotGroups = [];
  }

  private _createPlotMeshes(): void {
    for (let i = 0; i < PLOTS.length; i++) {
      const plot = PLOTS[i];
      const group = this._buildPlot(plot, i);
      this._plotGroups.push(group);
    }
  }

  private _buildPlot(plot: PlotRect, plotIndex: number): CropMeshGroup {
    const scene = this._scene;
    const root = new TransformNode(`plot_${plotIndex}_root`, scene);
    root.position.set(plot.cx, 0, plot.cz);

    const groundY = terrainHeight(plot.cx, plot.cz);
    root.position.y = groundY;

    const soilMesh = MeshBuilder.CreateGround(
      `plot_${plotIndex}_soil`,
      { width: plot.w, height: plot.d, subdivisions: 1 },
      scene
    );
    soilMesh.position.set(0, 0.02, 0);

    const soilMat = new PBRMaterial(`mat_plot_${plotIndex}_soil`, scene);
    soilMat.albedoColor = SOIL_COLOR;
    soilMat.roughness = 0.95;
    soilMat.metallic = 0;
    soilMesh.material = soilMat;
    soilMesh.receiveShadows = true;

    soilMesh.metadata = { entityType: "plot", entityId: String(plotIndex), entityKind: "plot" };

    const stems: Mesh[] = [];
    const heads: Mesh[] = [];

    const cropEntry = PLOT_CROPS.find((pc) => pc.plotIndex === plotIndex);
    const cropId =
      useCropStore.getState().planted.find((p) => p.plotIndex === plotIndex)?.cropId ??
      cropEntry?.cropId ??
      "wheat";
    const cropDef = CROP_TYPES.find((ct) => ct.id === cropId);
    const colorCfg = CROP_COLOR_MAP[cropId] ?? CROP_COLOR_MAP.wheat;
    const stemMat = new PBRMaterial(`mat_plot_${plotIndex}_stem`, scene);
    stemMat.albedoColor = STEM_COLOR;
    stemMat.roughness = 0.85;
    stemMat.metallic = 0;

    const headMat = new PBRMaterial(`mat_plot_${plotIndex}_head`, scene);
    headMat.albedoColor = colorCfg.head;
    headMat.roughness = 0.6;
    headMat.metallic = 0;
    headMat.emissiveColor = Color3.Black();

    const halfW = plot.w / 2 - 1;
    const halfD = plot.d / 2 - 1;
    const rows = cropDef?.rows ?? 4;
    const spacing = cropDef?.spacing ?? 1.0;
    const heightMin = cropDef?.heightMin ?? 0.6;
    const heightMax = cropDef?.heightMax ?? 1.0;

    const rng = this._seedRandom(plotIndex * 1337 + 42);

    for (let row = 0; row < rows; row++) {
      const count = Math.floor(plot.w / spacing);
      for (let c = 0; c < count; c++) {
        const x = -halfW + (c + 0.5) * spacing + (rng() - 0.5) * 0.2;
        const z = -halfD + (row + 0.5) * (plot.d / rows) + (rng() - 0.5) * 0.2;
        const height = heightMin + rng() * (heightMax - heightMin);

        const stem = MeshBuilder.CreateCylinder(
          `stem_${plotIndex}_${row}_${c}`,
          {
            height: height,
            diameterTop: 0.04,
            diameterBottom: 0.06,
            tessellation: 6,
          },
          scene
        );
        stem.parent = root;
        stem.position.set(x, height / 2, z);
        stem.material = stemMat;
        stems.push(stem);

        const headSize = 0.1 + rng() * 0.12;
        const head = MeshBuilder.CreateSphere(
          `head_${plotIndex}_${row}_${c}`,
          { diameter: headSize, segments: 6 },
          scene
        );
        head.parent = root;
        head.position.set(x, height + headSize * 0.3, z);
        head.material = headMat;
        heads.push(head);

        this._shadowGen?.addShadowCaster(stem, false);
        this._shadowGen?.addShadowCaster(head, false);
      }
    }

    return { roots: root, soilMesh, stems, heads };
  }

  private _seedRandom(seed: number): () => number {
    let s = seed;
    return () => {
      s = (s * 16807 + 0) % 2147483647;
      return (s - 1) / 2147483646;
    };
  }
}
