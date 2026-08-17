import {
  Engine,
  Scene,
  ParticleSystem,
  GPUParticleSystem,
  Texture,
  Vector3,
  Color4,
} from "@babylonjs/core";
import type { BabylonSystem } from "../core/BabylonLifecycle";
import { useWorldStore } from "../../../store/worldStore";
import { WEATHER, type WeatherKind } from "../../../config/world";

const RAIN_PARTICLE_COUNT = 1600;
const RAIN_AREA = 130;
const RAIN_FALL_SPEED = 13;

function createRainTexture(scene: Scene): Texture {
  const size = 4;
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext("2d")!;
  ctx.fillStyle = "rgba(180,200,230,0.6)";
  ctx.fillRect(0, 0, size, size);
  return new Texture(canvas.toDataURL(), scene, false, false);
}

function configureRain(ps: ParticleSystem | GPUParticleSystem, tex: Texture, scene: Scene): void {
  ps.particleTexture = tex;
  ps.emitter = new Vector3(0, 30, 0);
  ps.minSize = 0.05;
  ps.maxSize = 0.12;
  ps.minLifeTime = 0.8;
  ps.maxLifeTime = 1.2;
  ps.emitRate = RAIN_PARTICLE_COUNT * 0.6;
  ps.manualEmitCount = RAIN_PARTICLE_COUNT;
  ps.minEmitPower = 0;
  ps.maxEmitPower = 0;
  ps.gravity = new Vector3(0, -RAIN_FALL_SPEED * 0.5, 0);
  ps.color1 = new Color4(0.7, 0.75, 0.85, 0.4);
  ps.color2 = new Color4(0.6, 0.7, 0.8, 0.3);
  ps.colorDead = new Color4(0.5, 0.6, 0.7, 0);
  ps.blendMode = ParticleSystem.BLENDMODE_ADD;
  ps.updateSpeed = 0.01;
  ps.addSizeGradient(0, 0.06, 0.1);
  ps.addSizeGradient(0.5, 0.04, 0.08);
  ps.addSizeGradient(1, 0.02, 0.04);

  const minBox = new Vector3(-RAIN_AREA / 2, 10, -RAIN_AREA / 2);
  const maxBox = new Vector3(RAIN_AREA / 2, 15, RAIN_AREA / 2);
  if (ps instanceof GPUParticleSystem) {
    ps.minEmitBox = minBox;
    ps.maxEmitBox = maxBox;
  } else {
    ps.minEmitBox = minBox;
    ps.maxEmitBox = maxBox;
  }
}

function updateEmitter(ps: ParticleSystem | GPUParticleSystem, position: Vector3): void {
  ps.emitter = position;
  const minBox = new Vector3(-RAIN_AREA / 2, 10, -RAIN_AREA / 2);
  const maxBox = new Vector3(RAIN_AREA / 2, 15, RAIN_AREA / 2);
  if (ps instanceof GPUParticleSystem) {
    ps.minEmitBox = minBox;
    ps.maxEmitBox = maxBox;
  } else {
    ps.minEmitBox = minBox;
    ps.maxEmitBox = maxBox;
  }
}

export class WeatherSystem implements BabylonSystem {
  private _scene!: Scene;
  private _engine!: Engine;
  private _rainSystem: ParticleSystem | GPUParticleSystem | null = null;
  private _lastWeather: WeatherKind | null = null;

  init(scene: Scene, engine: Engine): void {
    this._scene = scene;
    this._engine = engine;
    this._lastWeather = useWorldStore.getState().weather;
    this._applyWeather(this._lastWeather);
  }

  update(_dt: number): void {
    const weather = useWorldStore.getState().weather;
    if (weather !== this._lastWeather) {
      this._lastWeather = weather;
      this._applyWeather(weather);
    }

    if (this._rainSystem && weather === "rain") {
      const cam = this._scene.activeCamera;
      if (cam) {
        updateEmitter(this._rainSystem, cam.position.clone());
      }
    }
  }

  dispose(): void {
    this._stopRain();
  }

  private _applyWeather(weather: WeatherKind): void {
    const cfg = WEATHER[weather];
    this._scene.fogDensity = cfg.fog;

    if (cfg.rain > 0 && !this._rainSystem) {
      this._startRain();
    } else if (cfg.rain === 0 && this._rainSystem) {
      this._stopRain();
    }
  }

  private _startRain(): void {
    const scene = this._scene;
    const tex = createRainTexture(scene);

    let ps: ParticleSystem | GPUParticleSystem;
    try {
      ps = new GPUParticleSystem(
        "rain",
        { capacity: RAIN_PARTICLE_COUNT },
        scene
      );
    } catch {
      ps = new ParticleSystem("rain", RAIN_PARTICLE_COUNT, scene);
    }

    configureRain(ps, tex, scene);
    ps.start();
    this._rainSystem = ps;
  }

  private _stopRain(): void {
    if (this._rainSystem) {
      this._rainSystem.stop();
      this._rainSystem.dispose();
      this._rainSystem = null;
    }
  }
}
