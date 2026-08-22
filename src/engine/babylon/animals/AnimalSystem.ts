import {
  Engine,
  Scene,
  Mesh,
  MeshBuilder,
  PBRMaterial,
  Vector3,
  Color3,
  TransformNode,
  type ShadowGenerator,
} from "@babylonjs/core";
import type { AnimalAgent, AnimalKind } from "../../../types";
import { animalRegistry } from "../../../store/farmStore";
import { terrainHeight } from "../core/WorldConstants";
import type { BabylonSystem } from "../core/BabylonLifecycle";

interface AnimalParts {
  root: TransformNode;
  body: Mesh;
  legs: Mesh[];
  head: Mesh;
  extra?: Mesh;
  extraMat?: PBRMaterial;
}

const KIND_COLORS: Record<
  AnimalKind,
  { body: string; accent: string }
> = {
  cow: { body: "#6b513a", accent: "#3a2c22" },
  pig: { body: "#f0b0a0", accent: "#e89080" },
  chicken: { body: "#e8dcc8", accent: "#d63f2e" },
  rooster: { body: "#c0a080", accent: "#d63f2e" },
};

const SCALES: Record<AnimalKind, [number, number, number]> = {
  cow: [1.15, 1.15, 1.15],
  pig: [0.78, 0.78, 0.78],
  chicken: [0.42, 0.42, 0.42],
  rooster: [0.48, 0.48, 0.48],
};

const WALK_SPEED: Record<AnimalKind, number> = {
  cow: 3.5,
  pig: 2.8,
  chicken: 4.5,
  rooster: 4.8,
};

export class AnimalSystem implements BabylonSystem {
  private _scene!: Scene;
  private _engine!: Engine;
  private _shadowGen?: ShadowGenerator;
  private _animals = new Map<number, AnimalParts>();

  init(scene: Scene, engine: Engine, shadows?: ShadowGenerator): void {
    this._scene = scene;
    this._engine = engine;
    this._shadowGen = shadows;
  }

  update(dt: number): void {
    const currentIds = new Set(animalRegistry.keys());

    for (const [id, agent] of animalRegistry) {
      let parts = this._animals.get(id);
      if (!parts) {
        parts = this._createAnimal(agent);
        this._animals.set(id, parts);
      }
      this._updateAnimal(agent, parts, dt);
    }

    for (const [id, parts] of this._animals) {
      if (!currentIds.has(id)) {
        this._disposeAnimal(parts);
        this._animals.delete(id);
      }
    }
  }

  dispose(): void {
    for (const [, parts] of this._animals) {
      this._disposeAnimal(parts);
    }
    this._animals.clear();
  }

  // ─── Private ──────────────────────────────────────────────

  private _createAnimal(agent: AnimalAgent): AnimalParts {
    const scene = this._scene;
    const s = SCALES[agent.kind];

    const root = new TransformNode(`animal_${agent.id}_${agent.kind}`, scene);

    const bodyMat = new PBRMaterial(`mat_animal_${agent.id}_body`, scene);
    bodyMat.albedoColor = Color3.FromHexString(KIND_COLORS[agent.kind].body);
    bodyMat.roughness = 0.85;
    bodyMat.metallic = 0;

    const accentMat = new PBRMaterial(`mat_animal_${agent.id}_accent`, scene);
    accentMat.albedoColor = Color3.FromHexString(KIND_COLORS[agent.kind].accent);
    accentMat.roughness = 0.8;
    accentMat.metallic = 0;

    let body: Mesh;
    let head: Mesh;
    const legs: Mesh[] = [];
    let extra: Mesh | undefined;

    if (agent.kind === "cow") {
      body = MeshBuilder.CreateBox(
        `cow_body_${agent.id}`,
        { width: 2 * s[0], height: 1.2 * s[1], depth: 1.2 * s[2] },
        scene
      );
      body.parent = root;
      body.position.y = 1.0 * s[1];
      body.material = bodyMat;

      head = MeshBuilder.CreateSphere(
        `cow_head_${agent.id}`,
        { diameter: 0.7 * s[0], segments: 8 },
        scene
      );
      head.parent = root;
      head.position = new Vector3(1.2 * s[0], 1.2 * s[1], 0);
      head.material = bodyMat;

      for (let i = 0; i < 4; i++) {
        const leg = MeshBuilder.CreateCylinder(
          `cow_leg_${agent.id}_${i}`,
          { height: 0.8 * s[1], diameter: 0.18 * s[0], tessellation: 8 },
          scene
        );
        leg.parent = root;
        leg.position = new Vector3(
          (i < 2 ? 0.6 : -0.6) * s[0],
          0.4 * s[1],
          (i % 2 === 0 ? 0.35 : -0.35) * s[2]
        );
        leg.material = accentMat;
        legs.push(leg);
      }

      const horn1 = MeshBuilder.CreateCylinder(
        `cow_horn1_${agent.id}`,
        { height: 0.25 * s[1], diameterTop: 0, diameterBottom: 0.06 * s[0], tessellation: 6 },
        scene
      );
      horn1.parent = root;
      horn1.position = new Vector3(1.0 * s[0], 1.65 * s[1], 0.18 * s[2]);
      horn1.rotation.z = 0.3;
      horn1.material = accentMat;

      const horn2 = horn1.clone(`cow_horn2_${agent.id}`);
      horn2.parent = root;
      horn2.position.z = -0.18 * s[2];
      horn2.rotation.z = 0.3;
    } else if (agent.kind === "pig") {
      body = MeshBuilder.CreateBox(
        `pig_body_${agent.id}`,
        { width: 1.4 * s[0], height: 0.9 * s[1], depth: 0.9 * s[2] },
        scene
      );
      body.parent = root;
      body.position.y = 0.75 * s[1];
      body.material = bodyMat;

      head = MeshBuilder.CreateBox(
        `pig_head_${agent.id}`,
        { width: 0.45 * s[0], height: 0.4 * s[1], depth: 0.45 * s[2] },
        scene
      );
      head.parent = root;
      head.position = new Vector3(0.85 * s[0], 0.85 * s[1], 0);
      head.material = bodyMat;

      const snoutMat = new PBRMaterial(`mat_animal_${agent.id}_snout`, scene);
      snoutMat.albedoColor = Color3.FromHexString("#e89080");
      snoutMat.roughness = 0.7;
      snoutMat.metallic = 0;
      extra = MeshBuilder.CreateBox(
        `pig_snout_${agent.id}`,
        { width: 0.18 * s[0], height: 0.12 * s[1], depth: 0.2 * s[2] },
        scene
      );
      extra.parent = root;
      extra.position = new Vector3(1.05 * s[0], 0.8 * s[1], 0);
      extra.material = snoutMat;

      for (let i = 0; i < 4; i++) {
        const leg = MeshBuilder.CreateCylinder(
          `pig_leg_${agent.id}_${i}`,
          { height: 0.55 * s[1], diameter: 0.14 * s[0], tessellation: 8 },
          scene
        );
        leg.parent = root;
        leg.position = new Vector3(
          (i < 2 ? 0.4 : -0.4) * s[0],
          0.28 * s[1],
          (i % 2 === 0 ? 0.28 : -0.28) * s[2]
        );
        leg.material = accentMat;
        legs.push(leg);
      }
    } else {
      const isRooster = agent.kind === "rooster";

      body = MeshBuilder.CreateSphere(
        `${agent.kind}_body_${agent.id}`,
        { diameter: 0.5 * s[0], segments: 8 },
        scene
      );
      body.parent = root;
      body.position.y = 0.5 * s[1];
      body.material = bodyMat;

      head = MeshBuilder.CreateSphere(
        `${agent.kind}_head_${agent.id}`,
        { diameter: 0.2 * s[0], segments: 6 },
        scene
      );
      head.parent = root;
      head.position = new Vector3(0.2 * s[0], 0.65 * s[1], 0);
      head.material = bodyMat;

      const beakMat = new PBRMaterial(`mat_animal_${agent.id}_beak`, scene);
      beakMat.albedoColor = Color3.FromHexString("#e8a33d");
      beakMat.roughness = 0.6;
      beakMat.metallic = 0;
      extra = MeshBuilder.CreateCylinder(
        `${agent.kind}_beak_${agent.id}`,
        { height: 0.15 * s[0], diameterTop: 0, diameterBottom: 0.06 * s[0], tessellation: 6 },
        scene
      );
      extra.parent = root;
      extra.position = new Vector3(0.35 * s[0], 0.63 * s[1], 0);
      extra.rotation.z = Math.PI / 2;
      extra.material = beakMat;

      const combMat = new PBRMaterial(`mat_animal_${agent.id}_comb`, scene);
      combMat.albedoColor = Color3.FromHexString("#d63f2e");
      combMat.roughness = 0.5;
      combMat.metallic = 0;
      const comb = MeshBuilder.CreateCylinder(
        `${agent.kind}_comb_${agent.id}`,
        {
          height: (isRooster ? 0.22 : 0.1) * s[1],
          diameterTop: 0,
          diameterBottom: 0.1 * s[0],
          tessellation: 6,
        },
        scene
      );
      comb.parent = root;
      comb.position = new Vector3(0.2 * s[0], 0.82 * s[1], 0);
      comb.material = combMat;

      if (isRooster) {
        const tail = MeshBuilder.CreateCylinder(
          `rooster_tail_${agent.id}`,
          { height: 0.4 * s[1], diameterTop: 0, diameterBottom: 0.12 * s[0], tessellation: 8 },
          scene
        );
        tail.parent = root;
        tail.position = new Vector3(-0.35 * s[0], 0.75 * s[1], 0);
        tail.rotation.z = -0.6;
        const tailMat = new PBRMaterial(`mat_animal_${agent.id}_tail`, scene);
        tailMat.albedoColor = Color3.FromHexString("#7a4a2e");
        tailMat.roughness = 0.7;
        tailMat.metallic = 0;
        tail.material = tailMat;
      }

      const legMat = new PBRMaterial(`mat_animal_${agent.id}_legs`, scene);
      legMat.albedoColor = Color3.FromHexString("#b89a60");
      legMat.roughness = 0.8;
      legMat.metallic = 0;

      for (let i = 0; i < 2; i++) {
        const leg = MeshBuilder.CreateCylinder(
          `${agent.kind}_leg_${agent.id}_${i}`,
          { height: 0.3 * s[1], diameter: 0.05 * s[0], tessellation: 6 },
          scene
        );
        leg.parent = root;
        leg.position = new Vector3(
          0,
          0.15 * s[1],
          (i === 0 ? 0.08 : -0.08) * s[2]
        );
        leg.material = legMat;
        legs.push(leg);
      }
    }

    this._shadowGen?.addShadowCaster(body, true);

    return { root, body, legs, head, extra };
  }

  private _updateAnimal(agent: AnimalAgent, parts: AnimalParts, dt: number): void {
    const worldY = terrainHeight(agent.position[0], agent.position[2]);
    parts.root.position.set(agent.position[0], worldY, agent.position[2]);
    parts.root.rotation.y = agent.rotation;

    const kindScale = SCALES[agent.kind];
    parts.body.scaling.set(
      agent.scale * kindScale[0],
      agent.scale * kindScale[1],
      agent.scale * kindScale[2]
    );

    this._animateState(agent, parts, dt);
  }

  private _animateState(agent: AnimalAgent, parts: AnimalParts, dt: number): void {
    const walkFreq = WALK_SPEED[agent.kind];
    const t = agent.walkPhase * walkFreq;
    const idleT = agent.idlePhase;

    switch (agent.state) {
      case "wander": {
        const legSwing = Math.sin(t) * 0.5;
        for (let i = 0; i < parts.legs.length; i++) {
          const sign = i % 2 === 0 ? 1 : -1;
          const phaseSign = i < parts.legs.length / 2 ? 1 : -1;
          parts.legs[i].rotation.x = legSwing * sign * phaseSign;
        }
        parts.body.position.y += Math.abs(Math.sin(t * 2)) * 0.03;
        parts.head.position.y -= Math.sin(t * 1.5) * 0.02;
        break;
      }

      case "eating": {
        for (const leg of parts.legs) {
          leg.rotation.x = 0;
        }
        const eatBob = Math.sin(idleT * 4) * 0.15;
        parts.head.rotation.z = -0.4 + eatBob;
        parts.body.position.y += Math.sin(idleT * 2) * 0.01;
        break;
      }

      case "sleep": {
        for (const leg of parts.legs) {
          leg.rotation.x = 0;
        }
        parts.head.rotation.z = 0.3;
        parts.body.position.y += Math.sin(idleT * 0.5) * 0.005;
        break;
      }

      case "rest":
      default: {
        const idleSwing = Math.sin(idleT * 1.5) * 0.05;
        for (const leg of parts.legs) {
          leg.rotation.x = idleSwing;
        }
        parts.body.position.y += Math.sin(idleT * 2) * 0.01;
        if (parts.head) {
          parts.head.rotation.z = Math.sin(idleT * 1.2) * 0.03;
        }
        break;
      }
    }
  }

  private _disposeAnimal(parts: AnimalParts): void {
    parts.root.dispose(false, true);
  }
}
