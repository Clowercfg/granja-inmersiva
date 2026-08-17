import {
  Scene,
  DirectionalLight,
  HemisphericLight,
  Vector3,
  Color3,
  Color4,
  ShadowGenerator,
  GlowLayer,
  DefaultRenderingPipeline,
} from "@babylonjs/core";

export interface LightingSetup {
  sun: DirectionalLight;
  ambient: HemisphericLight;
  shadows: ShadowGenerator;
  dispose: () => void;
}

/**
 * Configura iluminación PBR completa para la granja.
 * - Sol direccional con sombras suaves (PCF)
 * - Luz hemisférica ambiental
 * - Niebla atmosférica ligera
 * - Tone mapping y postprocesado básico
 */
export function createLighting(scene: Scene): LightingSetup {
  // ─── Sol direccional ───
  const sun = new DirectionalLight("sun", new Vector3(-0.6, -0.8, 0.4), scene);
  sun.position = new Vector3(80, 160, -60);
  sun.intensity = 1.8;
  sun.diffuse = new Color3(1, 0.96, 0.88);
  sun.specular = new Color3(1, 0.95, 0.85);

  // ─── Sombras suaves (PCF) ───
  const shadowGen = new ShadowGenerator(2048, sun);
  shadowGen.usePercentageCloserFiltering = true;
  shadowGen.filteringQuality = ShadowGenerator.QUALITY_MEDIUM;
  shadowGen.bias = 0.001;
  shadowGen.normalBias = 0.02;
  shadowGen.darkness = 0.25;
  shadowGen.transparencyShadow = true;

  // Extensión del mapa de sombras para cubrir toda la granja
  sun.shadowMinZ = 0;
  sun.shadowMaxZ = 400;
  sun.shadowOrthoScale = 2;

  // ─── Luz hemisférica ambiental ───
  const ambient = new HemisphericLight("ambient", new Vector3(0, 1, 0), scene);
  ambient.intensity = 0.55;
  ambient.diffuse = new Color3(0.7, 0.8, 0.95);
  ambient.groundColor = new Color3(0.3, 0.25, 0.18);
  ambient.specular = new Color3(0.1, 0.1, 0.1);

  // ─── Niebla atmosférica ───
  scene.fogMode = Scene.FOGMODE_EXP2;
  scene.fogDensity = 0.0012;
  scene.fogColor = new Color3(0.72, 0.78, 0.86);

  // ─── Postprocesado ligero ───
  const pipeline = new DefaultRenderingPipeline("defaultPipeline", true, scene);
  pipeline.bloomEnabled = true;
  pipeline.bloomThreshold = 0.85;
  pipeline.bloomWeight = 0.15;
  pipeline.bloomKernel = 64;
  pipeline.bloomScale = 0.5;

  pipeline.fxaaEnabled = true;
  pipeline.imageProcessingEnabled = true;
  pipeline.imageProcessing.toneMappingEnabled = true;
  pipeline.imageProcessing.toneMappingType = 1; // ACES
  pipeline.imageProcessing.exposure = 1.1;
  pipeline.imageProcessing.contrast = 1.05;

  // ─── Glow sutil para elementos luminosos ───
  const glow = new GlowLayer("glow", scene, {
    mainTextureFixedSize: 512,
    blurKernelSize: 32,
  });
  glow.intensity = 0.3;

  return {
    sun,
    ambient,
    shadows: shadowGen,
    dispose: () => {
      pipeline.dispose();
      glow.dispose();
      sun.dispose();
      ambient.dispose();
    },
  };
}
