import { PLOTS } from "../../../utils/terrain";
import { PanelShell, PanelSection, StatCell } from "./PanelShell";

export function CropsPanel() {
  const planted = 0;
  const ready = 0;
  return (
    <PanelShell icon="🌾" title="Cultivos" subtitle="Gestión de parcelas y cosechas">
      <div className="panel-grid">
        <StatCell icon="🧱" label="Parcelas" value={PLOTS.length} />
        <StatCell icon="🌱" label="Sembradas" value={planted} />
        <StatCell icon="🌿" label="En crecimiento" value={0} />
        <StatCell icon="🧺" label="Listas" value={ready} />
      </div>

      <PanelSection icon="🧱" title="Parcelas">
        <div className="empty">
          {PLOTS.length} parcelas preparadas en la granja. El sistema de siembra llegará en una
          próxima actualización.
        </div>
      </PanelSection>

      <PanelSection icon="🌱" title="Semillas">
        <div className="empty">Aún no dispones de semillas.</div>
      </PanelSection>

      <PanelSection icon="🌿" title="Crecimiento">
        <div className="empty">Sin cultivos activos. El ciclo de crecimiento se activará con las primeras siembras.</div>
      </PanelSection>

      <PanelSection icon="🧺" title="Cosecha">
        <div className="empty">Sin cosecha pendiente.</div>
      </PanelSection>

      <div className="hint">Panel preparado para parcelas, semillas, crecimiento y cosecha.</div>
    </PanelShell>
  );
}
