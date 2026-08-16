import { useCropStore } from "../../../store/cropStore";
import { useEconomyStore } from "../../../store/economyStore";
import { CROP_ECONOMY } from "../../../config/economy";
import { PanelShell, PanelSection, StatCell } from "./PanelShell";

const CROP_ICON: Record<string, string> = { wheat: "🌾", carrot: "🥕", potato: "🥔" };

export function InventoryPanel() {
  const inventory = useCropStore((s) => s.inventory);
  const gold = useEconomyStore((s) => s.gold);

  const cropIds = Object.keys(CROP_ECONOMY);
  const totalHarvest = cropIds.reduce((acc, id) => acc + (inventory[id]?.harvest ?? 0), 0);
  const totalSeeds = cropIds.reduce((acc, id) => acc + (inventory[id]?.seeds ?? 0), 0);

  return (
    <PanelShell icon="📦" title="Inventario" subtitle="Productos guardados en el Almacén">
      <div className="panel-grid">
        <StatCell icon="🧺" label="Cosechas" value={totalHarvest} />
        <StatCell icon="🌱" label="Semillas" value={totalSeeds} />
        <StatCell icon="📦" label="Cultivos" value={cropIds.length} />
        <StatCell icon="💵" label="USD" value={gold.toFixed(2)} />
      </div>

      <PanelSection icon="🧺" title="Cosechas almacenadas">
        {cropIds.map((id) => (
          <div className="inventory-row" key={id}>
            <span>
              {CROP_ICON[id] ?? "🌱"} {CROP_ECONOMY[id].name}
            </span>
            <span className="inventory-count">{inventory[id]?.harvest ?? 0}</span>
          </div>
        ))}
        <div className="empty">
          Las cosechas se guardan en el Almacén y aparecen como cajas en los estantes. Haz clic en una
          caja para ver la cantidad y venderla.
        </div>
      </PanelSection>

      <PanelSection icon="🌱" title="Semillas">
        {cropIds.map((id) => (
          <div className="inventory-row" key={id}>
            <span>
              {CROP_ICON[id] ?? "🌱"} Semillas de {CROP_ECONOMY[id].name.toLowerCase()}
            </span>
            <span className="inventory-count">{inventory[id]?.seeds ?? 0}</span>
          </div>
        ))}
      </PanelSection>

      <PanelSection icon="💰" title="Recursos">
        <div className="inventory-row">
          <span>USD</span>
          <span className="inventory-count">${gold.toFixed(2)}</span>
        </div>
      </PanelSection>

      <div className="hint">
        El inventario refleja en tiempo real lo que se recoge en la granja y lo que se almacena en el
        Almacén.
      </div>
    </PanelShell>
  );
}
