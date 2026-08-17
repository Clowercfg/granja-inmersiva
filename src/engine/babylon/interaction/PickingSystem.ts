import {
  Engine,
  Scene,
  MeshBuilder,
  PBRMaterial,
  Color3,
  type Nullable,
  type PickingInfo,
  type AbstractMesh,
} from "@babylonjs/core";
import type { BabylonSystem } from "../core/BabylonLifecycle";
import { useSelectionStore } from "../../../store/selectionStore";
import type { SelectedEntity } from "../../../types";

interface MeshMeta {
  entityType: string;
  entityId: string;
  entityKind?: string;
}

const RING_DIAMETER = 3.0;
const RING_THICKNESS = 0.15;

const RING_SELECTED_COLOR = new Color3(1, 0.85, 0.2);
const RING_HOVERED_COLOR = new Color3(0.5, 0.8, 1);
const RING_BASE_COLOR = new Color3(1, 1, 1);

export class PickingSystem implements BabylonSystem {
  private _scene!: Scene;
  private _engine!: Engine;

  private _ring: import("@babylonjs/core").Mesh | null = null;
  private _ringMat: PBRMaterial | null = null;
  private _hoveredId: string | null = null;
  private _selectedId: string | null = null;

  init(scene: Scene, engine: Engine): void {
    this._scene = scene;
    this._engine = engine;
    this._createRing();
    this._bindPointer();
  }

  update(_dt: number): void {
    const { selected, hovered } = useSelectionStore.getState();
    const newSelectedId = selected?.uid ?? null;
    const newHoveredId = hovered?.uid ?? null;

    if (newSelectedId !== this._selectedId) {
      this._selectedId = newSelectedId;
      this._updateRingVisual();
    }

    if (newHoveredId !== this._hoveredId) {
      this._hoveredId = newHoveredId;
      this._updateRingVisual();
    }

    if (this._ring && this._ring.isEnabled()) {
      this._updateRingPosition();
    }
  }

  dispose(): void {
    if (this._ring) {
      this._ring.dispose();
    }
  }

  // ─── Private ──────────────────────────────────────────────

  private _createRing(): void {
    this._ring = MeshBuilder.CreateTorus(
      "selection_ring",
      { diameter: RING_DIAMETER, thickness: RING_THICKNESS, tessellation: 32 },
      this._scene
    );
    this._ring.rotation.x = Math.PI / 2;
    this._ring.isVisible = false;
    this._ring.isPickable = false;

    this._ringMat = new PBRMaterial("ring_mat", this._scene);
    this._ringMat.albedoColor = RING_BASE_COLOR;
    this._ringMat.emissiveColor = RING_SELECTED_COLOR;
    this._ringMat.roughness = 0.2;
    this._ringMat.metallic = 0.8;
    this._ringMat.alpha = 0.8;
    this._ring.material = this._ringMat;
  }

  private _bindPointer(): void {
    this._scene.onPointerDown = (_evt, pickInfo) => {
      this._handleClick(pickInfo);
    };

    this._scene.onPointerMove = () => {
      const pick = this._scene.pick(
        this._scene.pointerX,
        this._scene.pointerY
      );
      this._handleHover(pick);
    };
  }

  private _handleHover(pick: Nullable<PickingInfo>): void {
    const meta = this._extractMeta(pick);
    const { setHover } = useSelectionStore.getState();

    if (meta) {
      const entity: SelectedEntity = {
        kind: meta.entityType as SelectedEntity["kind"],
        uid: meta.entityId,
        title: meta.entityKind ?? meta.entityType,
        subtitle: meta.entityId,
      };
      setHover(entity);
      this._scene.defaultCursor = "pointer";
    } else {
      setHover(null);
      this._scene.defaultCursor = "default";
    }
  }

  private _handleClick(pick: Nullable<PickingInfo>): void {
    const meta = this._extractMeta(pick);
    const { select } = useSelectionStore.getState();

    if (meta) {
      const entity: SelectedEntity = {
        kind: meta.entityType as SelectedEntity["kind"],
        uid: meta.entityId,
        title: meta.entityKind ?? meta.entityType,
        subtitle: meta.entityId,
      };
      select(entity);
    } else {
      select(null);
    }
  }

  private _extractMeta(pick: Nullable<PickingInfo>): MeshMeta | null {
    if (!pick?.hit || !pick.pickedMesh) return null;
    const mesh = pick.pickedMesh;
    const meta = mesh.metadata as MeshMeta | undefined;
    if (!meta?.entityType || !meta?.entityId) return null;
    return meta;
  }

  private _updateRingVisual(): void {
    if (!this._ring || !this._ringMat) return;

    if (this._selectedId) {
      this._ring.isVisible = true;
      this._ringMat.emissiveColor = RING_SELECTED_COLOR;
      this._ringMat.albedoColor = RING_SELECTED_COLOR;
    } else if (this._hoveredId) {
      this._ring.isVisible = true;
      this._ringMat.emissiveColor = RING_HOVERED_COLOR;
      this._ringMat.albedoColor = RING_HOVERED_COLOR;
    } else {
      this._ring.isVisible = false;
    }
  }

  private _updateRingPosition(): void {
    if (!this._ring) return;

    const targetId = this._selectedId ?? this._hoveredId;
    if (!targetId) {
      this._ring.isVisible = false;
      return;
    }

    const mesh = this._findMeshByMeta(targetId);

    if (mesh) {
      this._ring.position = mesh.getAbsolutePosition().clone();
      this._ring.position.y += 0.05;
      this._ring.isVisible = true;
    } else {
      this._ring.isVisible = false;
    }
  }

  private _findMeshByMeta(entityId: string): AbstractMesh | null {
    for (const mesh of this._scene.meshes) {
      const meta = mesh.metadata as MeshMeta | undefined;
      if (meta?.entityId === entityId) {
        return mesh;
      }
    }
    return null;
  }
}
