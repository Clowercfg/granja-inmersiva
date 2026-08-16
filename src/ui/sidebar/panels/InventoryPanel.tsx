import { useCropStore } from "../../../store/cropStore";
import { useEconomyStore } from "../../../store/economyStore";
import { CROP_ECONOMY } from "../../../config/economy";
import { useT } from "../../../store/languageStore";
import { PanelShell, PanelSection, StatCell } from "./PanelShell";

const CROP_ICON: Record<string, string> = { wheat: "🌾", carrot: "🥕", potato: "🥔" };

export function InventoryPanel() {
  const t = useT();
  const inventory = useCropStore((s) => s.inventory);
  const gold = useEconomyStore((s) => s.gold);

  const cropIds = Object.keys(CROP_ECONOMY);
  const totalHarvest = cropIds.reduce((acc, id) => acc + (inventory[id]?.harvest ?? 0), 0);
  const totalSeeds = cropIds.reduce((acc, id) => acc + (inventory[id]?.seeds ?? 0), 0);

  return (
    <PanelShell icon="📦" title={t("panel.inventory.title")} subtitle={t("panel.inventory.subtitle")}>
      <div className="panel-grid">
        <StatCell icon="🧺" label={t("panel.inventory.harvests")} value={totalHarvest} />
        <StatCell icon="🌱" label={t("panel.inventory.seeds")} value={totalSeeds} />
        <StatCell icon="📦" label={t("panel.inventory.crops")} value={cropIds.length} />
        <StatCell icon="💵" label="USD" value={gold.toFixed(2)} />
      </div>

      <PanelSection icon="🧺" title={t("panel.inventory.harvests_title")}>
        {cropIds.map((id) => (
          <div className="inventory-row" key={id}>
            <span>
              {CROP_ICON[id] ?? "🌱"} {t(`crop.${id}`)}
            </span>
            <span className="inventory-count">{inventory[id]?.harvest ?? 0}</span>
          </div>
        ))}
        <div className="empty">{t("panel.inventory.harvests_hint")}</div>
      </PanelSection>

      <PanelSection icon="🌱" title={t("panel.inventory.seeds_title")}>
        {cropIds.map((id) => (
          <div className="inventory-row" key={id}>
            <span>
              {CROP_ICON[id] ?? "🌱"} {t("panel.inventory.seeds_of", { name: t(`crop.${id}`).toLowerCase() })}
            </span>
            <span className="inventory-count">{inventory[id]?.seeds ?? 0}</span>
          </div>
        ))}
      </PanelSection>

      <PanelSection icon="💰" title={t("panel.inventory.resources")}>
        <div className="inventory-row">
          <span>USD</span>
          <span className="inventory-count">${gold.toFixed(2)}</span>
        </div>
      </PanelSection>

      <div className="hint">{t("panel.inventory.hint")}</div>
    </PanelShell>
  );
}
