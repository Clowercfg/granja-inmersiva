import { useMemo } from "react";
import { STATIC_BUILDINGS } from "../../../config/layout";
import type { BuildingType } from "../../../config/world";
import { BUILDING_LABEL } from "../../../config/layout";
import { BUILDING_INFO, ENCLOSURE_INFO } from "../../../config/buildingInfo";
import { getInteriorDef, hasInterior } from "../../../config/interiors";
import { useInteriorStore } from "../../../store/interiorStore";
import { useSelectionStore } from "../../../store/selectionStore";
import { useUpgradesStore } from "../../../store/upgradesStore";
import { PanelShell, StatCell, PanelSection } from "./PanelShell";

interface Row {
  uid: string;
  type: BuildingType;
  level: number;
}

/** Capacidad dinámica según el nivel de mejoras comprado. */
function upgradedCapacity(type: BuildingType): string | null {
  if (type === "cowPen") return `${useUpgradesStore.getState().capacityOf("stable")} vacas`;
  if (type === "chickenPen") return `${useUpgradesStore.getState().capacityOf("coop")} gallinas`;
  return null;
}

function InfrastructureRow({ uid, type, level }: Row) {
  const info = BUILDING_INFO[type];
  const enterable = hasInterior(type);
  const dynCap = upgradedCapacity(type);
  const capacity = dynCap ?? info?.capacity;

  const onEnter = () => {
    useInteriorStore.getState().requestEnter(uid, type);
    useSelectionStore.getState().select(null);
  };

  const onSelect = () => {
    useSelectionStore.getState().select({
      kind: "building",
      uid,
      title: info ? info.detail.split(".")[0] : BUILDING_LABEL[type],
      subtitle: `${BUILDING_LABEL[type]} · Nivel ${level}`,
    });
  };

  const statusClass = info?.status === "operativo" ? "status-ok" : info?.status === "mantenimiento" ? "status-warn" : "status-idle";

  return (
    <div className="panelrow">
      <div className="panelrow-icon">{info?.icon ?? "🏗️"}</div>
      <div className="panelrow-main">
        <div className="panelrow-title">
          {BUILDING_LABEL[type]}{" "}
          <span className={`status-chip ${statusClass}`}>{info?.status ?? "operativo"}</span>
        </div>
        <div className="panelrow-sub">{info?.detail}</div>
        <div className="infra-stats">
          <span>🗄️ {capacity ?? "—"}</span>
          <span>📦 {info?.storage ?? "—"}</span>
        </div>
      </div>
      <div className="panelrow-actions">
        {enterable && (
          <button className="btn small primary" onClick={onEnter}>
            🚪 Entrar
          </button>
        )}
        <button className="btn small" onClick={onSelect}>
          Ver
        </button>
      </div>
    </div>
  );
}

export function InfrastructurePanel() {
  const rows = useMemo<Row[]>(
    () => STATIC_BUILDINGS.map((b) => ({ uid: b.uid, type: b.type, level: b.level })),
    []
  );
  useUpgradesStore((s) => s.levels["stable"] + ":" + s.levels["coop"]);

  return (
    <PanelShell icon="🏗️" title="Infraestructura" subtitle="Edificios existentes de la granja">
      <div className="panel-grid">
        <StatCell icon="🏗️" label="Edificios" value={rows.length} />
        <StatCell icon="🐄" label="Corrales" value={ENCLOSURE_INFO.length} />
        <StatCell icon="📈" label="Nivel total" value={rows.reduce((a, r) => a + r.level, 0)} />
      </div>

      <h4 className="panel-h4">Edificios existentes</h4>
      {rows.map((r) => (
        <InfrastructureRow key={r.uid} uid={r.uid} type={r.type} level={r.level} />
      ))}

      <PanelSection icon="🚧" title="Corrales (áreas cercadas)">
        {ENCLOSURE_INFO.map((e) => (
          <div className="panelrow" key={e.id}>
            <div className="panelrow-icon">{e.icon}</div>
            <div className="panelrow-main">
              <div className="panelrow-title">{e.name}</div>
              <div className="panelrow-sub">
                Capacidad {e.capacity} · cercas y puerta propias
              </div>
            </div>
          </div>
        ))}
      </PanelSection>

      <div className="hint">
        La infraestructura de la granja ya está construida y solo puede administrarse: consulta el
        estado de cada edificio o entra al Granero para inspeccionar su interior.
      </div>
    </PanelShell>
  );
}
