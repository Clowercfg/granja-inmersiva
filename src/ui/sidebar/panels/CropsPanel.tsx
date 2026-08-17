import { useEffect, useState } from "react";
import { useCropStore, growthProgressOf, growthMsOf } from "../../../store/cropStore";
import { useEconomyStore } from "../../../store/economyStore";
import { CROP_ECONOMY } from "../../../config/economy";
import { PLOTS } from "../../../utils/terrain";
import { useUpgradesStore } from "../../../store/upgradesStore";
import { useT } from "../../../store/languageStore";
import { PanelShell, PanelSection, StatCell } from "./PanelShell";

const CROP_ICON: Record<string, string> = { wheat: "🌾", carrot: "🥕", potato: "🥔", corn: "🌽" };

function fmtPrice(n: number): string {
  return String(+n.toFixed(4));
}

function formatRemaining(ms: number): string {
  const totalMin = Math.max(0, Math.ceil(ms / 60000));
  const h = Math.floor(totalMin / 60);
  const m = totalMin % 60;
  return `${h}h ${m}m`;
}

export function CropsPanel() {
  const t = useT();
  const [, setTick] = useState(0);
  useEffect(() => {
    const iv = setInterval(() => setTick((t) => t + 1), 500);
    return () => clearInterval(iv);
  }, []);

  const planted = useCropStore((s) => s.planted);
  const inventory = useCropStore((s) => s.inventory);
  const buySeed = useCropStore((s) => s.buySeed);
  const plantCrop = useCropStore((s) => s.plantCrop);
  const harvestCrop = useCropStore((s) => s.harvestCrop);
  const sellHarvest = useCropStore((s) => s.sellHarvest);
  const findEmptyPlot = useCropStore((s) => s.findEmptyPlot);
  const gold = useEconomyStore((s) => s.gold);
  const granaryCapacity = useUpgradesStore((s) => s.capacityOf("granary"));

  const cropIds = Object.keys(CROP_ECONOMY);
  const totalSeeds = cropIds.reduce((acc, id) => acc + (inventory[id]?.seeds ?? 0), 0);
  const totalHarvest = cropIds.reduce((acc, id) => acc + (inventory[id]?.harvest ?? 0), 0);
  const totalPlanted = planted.reduce((acc, p) => acc + p.quantity, 0);
  const growing = planted.filter((p) => p.state === "growing").reduce((a, p) => a + p.quantity, 0);
  const ready = planted.filter((p) => p.state === "ready").reduce((a, p) => a + p.quantity, 0);
  const emptyPlots = PLOTS.length - planted.length;

  const handlePlant = (cropId: string) => {
    const plotIndex = findEmptyPlot();
    if (plotIndex < 0) return;
    const result = plantCrop(cropId, plotIndex);
    if (result && typeof result === "object" && "planted" in result) {
      setTick((v) => v + 1);
    }
  };

  return (
    <PanelShell icon="🌾" title={t("panel.crops.title")} subtitle={t("panel.crops.subtitle")}>
      <div className="panel-grid">
        <StatCell icon="🧱" label={t("panel.crops.plots")} value={`${PLOTS.length - emptyPlots}/${PLOTS.length}`} />
        <StatCell icon="🌱" label={t("panel.crops.seeds")} value={totalSeeds} />
        <StatCell icon="🌿" label={t("panel.crops.planted")} value={totalPlanted} />
        <StatCell icon="🧺" label={t("panel.crops.harvest")} value={totalHarvest} />
        <StatCell icon="🏗️" label={t("panel.crops.capacity")} value={`${totalPlanted}/${granaryCapacity}`} />
        <StatCell icon="💵" label="USD" value={gold.toFixed(2)} />
      </div>

      {cropIds.map((cropId) => {
        const econ = CROP_ECONOMY[cropId];
        const inv = inventory[cropId] ?? { seeds: 0, harvest: 0 };
        const plantedCrop = planted.find((p) => p.cropId === cropId) ?? null;
        const hasEmptyPlot = findEmptyPlot() >= 0;
        const canBuy = gold >= econ.seedPrice;
        const canPlant = inv.seeds > 0 && hasEmptyPlot && totalPlanted < granaryCapacity;
        const icon = CROP_ICON[cropId] ?? "🌱";
        const cropName = t(`crop.${cropId}`);

        return (
          <PanelSection key={cropId} icon={icon} title={cropName}>
            <div className="panelrow">
              <div className="panelrow-icon">{icon}</div>
              <div className="panelrow-main">
                <div className="panelrow-title">{cropName}</div>
                <div className="panelrow-sub">
                  {t("panel.crops.detail", {
                    seed: `$${fmtPrice(econ.seedPrice)}`,
                    hours: econ.growthHours,
                    sell: `$${fmtPrice(econ.sellPrice)}`,
                    profit: `$${fmtPrice(econ.profitPerUnit)}`,
                  })}
                </div>
              </div>
              <div className="panelrow-side">
                <b>{inv.seeds}</b>
                <span className="muted">{t("panel.crops.harvested", { n: inv.harvest })}</span>
              </div>
            </div>

            <div className="panelrow-actions">
              <button className="btn small" disabled={!canBuy} onClick={() => buySeed(cropId)}>
                {t("panel.crops.buy_seed")}
              </button>
              <button
                className="btn small primary"
                disabled={!canPlant}
                onClick={() => handlePlant(cropId)}
              >
                {t("panel.crops.plant")} {inv.seeds > 0 ? `(${inv.seeds})` : ""}
              </button>
              <button
                className="btn small"
                disabled={plantedCrop?.state !== "ready"}
                onClick={() => {
                  if (plantedCrop) {
                    const result = harvestCrop(plantedCrop.id);
                    if (result && typeof result === "object" && "harvested" in result) {
                      setTick((v) => v + 1);
                    }
                  }
                }}
              >
                {t("panel.crops.harvest_btn")} {plantedCrop?.state === "ready" && plantedCrop.quantity > 1 ? `(${plantedCrop.quantity})` : ""}
              </button>
              <button
                className="btn small"
                disabled={inv.harvest < 1}
                onClick={() => sellHarvest(cropId, 1)}
              >
                {t("panel.crops.sell_1")}
              </button>
              <button
                className="btn small"
                disabled={inv.harvest < 1}
                onClick={() => sellHarvest(cropId, inv.harvest)}
              >
                {t("panel.crops.sell_all")}
              </button>
            </div>
            <div className="muted">{t("panel.crops.seed_note", { price: `$${fmtPrice(econ.seedPrice)}` })}</div>
          </PanelSection>
        );
      })}

      <PanelSection icon="🌿" title={t("panel.crops.growth")}>
        {PLOTS.map((plot, plotIndex) => {
          const plantedCrop = planted.find((p) => p.plotIndex === plotIndex) ?? null;
          const progress = plantedCrop ? growthProgressOf(plantedCrop) : 0;
          const remainingMs =
            plantedCrop && plantedCrop.state !== "ready"
              ? Math.max(0, growthMsOf(plantedCrop) - (Date.now() - plantedCrop.plantedAt))
              : 0;
          const status = !plantedCrop
            ? t("panel.crops.plot_empty")
            : plantedCrop.state === "ready"
              ? `${t("panel.crops.ready")} (${plantedCrop.quantity} u.)`
              : `${t("panel.crops.growing_left", { time: formatRemaining(remainingMs) })} (${plantedCrop.quantity} u.)`;
          const icon = plantedCrop ? (CROP_ICON[plantedCrop.cropId] ?? "🌱") : null;
          const cropName = plantedCrop ? t(`crop.${plantedCrop.cropId}`) : null;

          return (
            <div className="panelrow" key={plotIndex}>
              <div className="panelrow-icon">{icon ?? "🟫"}</div>
              <div className="panelrow-main">
                <div className="panelrow-title">
                  {cropName
                    ? `${t("panel.crops.plot_of", { name: cropName.toLowerCase() })}`
                    : `${t("panel.crops.plot_number", { n: plotIndex + 1 })}`}
                </div>
                <div className="panelrow-sub">{status}</div>
                <div className={`bar ${plantedCrop?.state === "ready" ? "good" : "warn"}`} style={{ width: "100%" }}>
                  <div style={{ width: `${Math.round(progress * 100)}%` }} />
                </div>
              </div>
              <div className="panelrow-side">
                <b>
                  {plantedCrop?.state === "ready"
                    ? `${t("panel.crops.ready_short")} ×${plantedCrop.quantity}`
                    : plantedCrop
                      ? formatRemaining(remainingMs)
                      : "—"}
                </b>
              </div>
            </div>
          );
        })}
        <div className="empty">{t("panel.crops.summary", { ready, growing })}</div>
      </PanelSection>

      <div className="hint">{t("panel.crops.hint")}</div>
    </PanelShell>
  );
}
