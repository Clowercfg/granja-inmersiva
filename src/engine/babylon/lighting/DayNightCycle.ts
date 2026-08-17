import {
  Scene,
  Engine,
  Vector3,
  Color3,
  Color4,
  DirectionalLight,
  HemisphericLight,
} from "@babylonjs/core";
import type { ShadowGenerator } from "@babylonjs/core";
import { useWorldStore } from "../../../store/worldStore";
import { WEATHER } from "../../../config/world";
import type { BabylonSystem } from "../core/BabylonLifecycle";

const SUN_COLOR_DAY = new Color3(1, 0.96, 0.88);
const SUN_COLOR_SUNSET = new Color3(1, 0.55, 0.2);
const SUN_COLOR_CLOUDY = new Color3(0.9, 0.92, 0.95);

const SKY_TOP_DAY = new Color3(0.35, 0.55, 0.85);
const SKY_TOP_NIGHT = new Color3(0.12, 0.14, 0.25);

const FOG_DAY = new Color3(0.72, 0.78, 0.86);
const FOG_NIGHT = new Color3(0.12, 0.15, 0.22);

function lerpColor(a: Color3, b: Color3, t: number): Color3 {
  return new Color3(
    a.r + (b.r - a.r) * t,
    a.g + (b.g - a.g) * t,
    a.b + (b.b - a.b) * t,
  );
}

export class DayNightCycle implements BabylonSystem {
  private scene!: Scene;
  private sun!: DirectionalLight;
  private ambient!: HemisphericLight;

  init(scene: Scene, _engine: Engine, _shadows?: ShadowGenerator): void {
    this.scene = scene;

    const existingSun = scene.getLightByName("sun");
    const existingAmbient = scene.getLightByName("ambient");
    if (existingSun instanceof DirectionalLight) this.sun = existingSun;
    if (existingAmbient instanceof HemisphericLight) this.ambient = existingAmbient;
  }

  update(_dt: number): void {
    if (!this.sun || !this.ambient) return;

    const world = useWorldStore.getState();
    const { hour, minute, weather } = world;
    const timeOfDay = hour + minute / 60;
    const sunAngle = ((timeOfDay - 6) / 12) * Math.PI;

    const sunHeight = Math.sin(sunAngle);
    const dayFactor = Math.max(0, Math.min(1, (sunHeight + 0.2) / 0.5));

    const sunDir = new Vector3(
      Math.cos(sunAngle) * Math.sqrt(Math.max(0, 1 - sunHeight * sunHeight)),
      sunHeight,
      Math.sin(sunAngle) * 0.3,
    ).normalize();
    this.sun.direction = sunDir.scale(-1);
    this.sun.position = sunDir.scale(-160);

    const weatherDim = weather === "clear" ? 1 : weather === "cloudy" ? 0.6 : 0.4;
    const weatherCfg = WEATHER[weather];
    const baseIntensity = Math.max(0.15, Math.pow(dayFactor, 1.0)) * weatherDim;
    const sunColor = lerpColor(SUN_COLOR_SUNSET, SUN_COLOR_DAY, dayFactor);

    if (weather !== "clear") {
      this.sun.diffuse = lerpColor(sunColor, SUN_COLOR_CLOUDY, weather === "cloudy" ? 0.5 : 0.72);
    } else {
      this.sun.diffuse = sunColor;
    }
    this.sun.intensity = baseIntensity * (weatherCfg?.sunIntensity ?? 2.4);

    this.ambient.intensity = 0.25 + dayFactor * 0.5;

    const fogBlend = dayFactor;
    const fogColor = lerpColor(FOG_NIGHT, FOG_DAY, fogBlend);
    this.scene.fogColor = fogColor;
    this.scene.fogDensity = (weatherCfg?.fog ?? 0.00035) + (1 - fogBlend) * 0.0005;

    const skyColor = lerpColor(SKY_TOP_NIGHT, SKY_TOP_DAY, dayFactor);
    this.scene.clearColor = new Color4(skyColor.r, skyColor.g, skyColor.b, 1);

    if (this.scene.ambientColor) {
      const ambientDay = new Color3(0.5, 0.5, 0.5);
      const ambientNight = new Color3(0.08, 0.08, 0.12);
      this.scene.ambientColor = lerpColor(ambientNight, ambientDay, dayFactor);
    }
  }

  dispose(): void {}
}
