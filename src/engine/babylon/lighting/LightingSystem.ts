import {
  Scene,
  Engine,
  DirectionalLight,
  HemisphericLight,
  Vector3,
  Color3,
  ShadowGenerator,
  GlowLayer,
  DefaultRenderingPipeline,
  EnvironmentHelper,
} from "@babylonjs/core";
import type { BabylonSystem } from "../core/BabylonLifecycle";

export class LightingSystem implements BabylonSystem {
  private sun!: DirectionalLight;
  private ambient!: HemisphericLight;
  private pipeline!: DefaultRenderingPipeline;
  private glow!: GlowLayer;
  private envHelper!: EnvironmentHelper | null;

  init(scene: Scene, engine: Engine): void {
    this.sun = new DirectionalLight("sun", new Vector3(-0.6, -0.8, 0.4), scene);
    this.sun.position = new Vector3(80, 160, -60);
    this.sun.intensity = 1.8;
    this.sun.diffuse = new Color3(1, 0.96, 0.88);
    this.sun.specular = new Color3(1, 0.95, 0.85);
    this.sun.shadowMinZ = 0;
    this.sun.shadowMaxZ = 400;
    this.sun.shadowOrthoScale = 2;

    const shadowGen = new ShadowGenerator(2048, this.sun);
    shadowGen.usePercentageCloserFiltering = true;
    shadowGen.filteringQuality = ShadowGenerator.QUALITY_MEDIUM;
    shadowGen.bias = 0.001;
    shadowGen.normalBias = 0.02;
    shadowGen.darkness = 0.25;
    shadowGen.transparencyShadow = true;

    this.ambient = new HemisphericLight("ambient", new Vector3(0, 1, 0), scene);
    this.ambient.intensity = 0.7;
    this.ambient.diffuse = new Color3(0.75, 0.82, 0.95);
    this.ambient.groundColor = new Color3(0.35, 0.3, 0.22);
    this.ambient.specular = new Color3(0.15, 0.15, 0.15);

    scene.fogMode = Scene.FOGMODE_EXP2;
    scene.fogDensity = 0.0008;
    scene.fogColor = new Color3(0.72, 0.78, 0.86);

    scene.ambientColor = new Color3(0.5, 0.5, 0.5);

    this.envHelper = scene.createDefaultEnvironment({
      createSkybox: false,
      createGround: false,
      environmentTexture: undefined,
      skyboxSize: 1,
    }) as EnvironmentHelper | null;

    this.pipeline = new DefaultRenderingPipeline("defaultPipeline", true, scene);
    this.pipeline.bloomEnabled = true;
    this.pipeline.bloomThreshold = 0.85;
    this.pipeline.bloomWeight = 0.15;
    this.pipeline.bloomKernel = 64;
    this.pipeline.bloomScale = 0.5;
    this.pipeline.fxaaEnabled = true;
    this.pipeline.imageProcessingEnabled = true;
    this.pipeline.imageProcessing.toneMappingEnabled = true;
    this.pipeline.imageProcessing.toneMappingType = 1;
    this.pipeline.imageProcessing.exposure = 1.15;
    this.pipeline.imageProcessing.contrast = 1.08;

    this.glow = new GlowLayer("glow", scene, {
      mainTextureFixedSize: 512,
      blurKernelSize: 32,
    });
    this.glow.intensity = 0.3;
  }

  getShadowGenerator(): ShadowGenerator {
    return this.sun.getShadowGenerator() as ShadowGenerator;
  }

  dispose(): void {
    this.pipeline?.dispose();
    this.glow?.dispose();
    this.sun?.dispose();
    this.ambient?.dispose();
    this.envHelper?.dispose();
  }
}
