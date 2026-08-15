import { useEffect, useState } from "react";
import { useCropStore, growthProgressOf, growthMsOf } from "../../../store/cropStore";
import { useEconomyStore } from "../../../store/economyStore";
import { CROP_ECONOMY } from "../../../config/economy";
import { PLOT_ECONOMY } from "../../../config/crops";
import { PLOTS } from "../../../utils/terrain";
import { PanelShell, PanelSection, StatCell } from "./PanelShell";

const CROP_ICON: Record<string, string> = { wheat: "🌾", carrot: "🥕", potato: "🥔" };

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
  const gold = useEconomyStore((s) => s.gold);

  const cropIds = Object.keys(CROP_ECONOMY);
  const totalSeeds = cropIds.reduce((acc, id) => acc + (inventory[id]?.seeds ?? 0), 0);
  const totalHarvest = cropIds.reduce((acc, id) => acc + (inventory[id]?.harvest ?? 0), 0);
  const growing = planted.filter((p) => p.state === "growing").length;
  const ready = planted.filter((p) => p.state === "ready").length;

  return (
    <PanelShell icon="🌾" title="Cultivos" subtitle="Siembra, crecimiento y venta">
      <div className="panel-grid">
        <StatCell icon="🧱" label="Parcelas" value={PLOTS.length} />
        <StatCell icon="🌱" label="Semillas" value={totalSeeds} />
        <StatCell icon="🧺" label="Cosecha" value={totalHarvest} />
        <StatCell icon="💵" label="USD" value={gold.toFixed(2)} />
      </div>

      {cropIds.map((cropId) => {
        const econ = CROP_ECONOMY[cropId];
        const inv = inventory[cropId] ?? { seeds: 0, harvest: 0 };
        const plotIndex = PLOT_ECONOMY.find((p) => p.cropId === cropId)?.plotIndex;
        const plantedCrop =
          plotIndex !== undefined ? (planted.find((p) => p.plotIndex === plotIndex) ?? null) : null;
        const canBuy = gold >= econ.seedPrice;
        const canPlant = !plantedCrop && inv.seeds > 0;
        const icon = CROP_ICON[cropId] ?? "🌱";

        return (
          <PanelSection key={cropId} icon={icon} title={econ.name}>
            <div className="panelrow">
              <div className="panelrow-icon">{icon}</div>
              <div className="panelrow-main">
                <div className="panelrow-title">{econ.name}</div>
                <div className="panelrow-sub">
                  Semilla ${fmtPrice(econ.seedPrice)} · Crecimiento {econ.growthHours} h · Venta $
                  {fmtPrice(econ.sellPrice)} · Ganancia ${fmtPrice(econ.profitPerUnit)}
                </div>
              </div>
              <div className="panelrow-side">
                <b>{inv.seeds}</b>
                <span className="muted">{inv.harvest} cosechada</span>
              </div>
            </div>

            <div className="panelrow-actions">
              <button className="btn small" disabled={!canBuy} onClick={() => buySeed(cropId)}>
                Comprar semilla
              </button>
              <button
                className="btn small primary"
                disabled={!canPlant}
                onClick={() => plotIndex !== undefined && plantCrop(cropId, plotIndex)}
              >
                Sembrar
              </button>
              <button
                className="btn small"
                disabled={plantedCrop?.state !== "ready"}
                onClick={() => plantedCrop && harvestCrop(plantedCrop.id)}
              >
                Cosechar
              </button>
              <button
                className="btn small"
                disabled={inv.harvest < 1}
                onClick={() => sellHarvest(cropId, 1)}
              >
                Vender 1
              </button>
              <button
                className="btn small"
                disabled={inv.harvest < 1}
                onClick={() => sellHarvest(cropId, inv.harvest)}
              >
                Vender todo
              </button>
            </div>
            <div className="muted">
              Cada semilla cuesta ${fmtPrice(econ.seedPrice)} (se descuenta al comprar).
            </div>
          </PanelSection>
        );
      })}

      <PanelSection icon="🌿" title="Crecimiento">
        {PLOT_ECONOMY.map(({ plotIndex, cropId }) => {
          const econ = CROP_ECONOMY[cropId];
          const plantedCrop = planted.find((p) => p.plotIndex === plotIndex) ?? null;
          const progress = plantedCrop ? growthProgressOf(plantedCrop) : 0;
          const remainingMs =
            plantedCrop && plantedCrop.state !== "ready"
              ? Math.max(0, growthMsOf(plantedCrop) - (Date.now() - plantedCrop.plantedAt))
              : 0;
          const status = !plantedCrop
            ? "Vacía — clic en la parcela para sembrar"
            : plantedCrop.state === "ready"
              ? "Lista para cosechar"
              : `Creciendo · quedan ${formatRemaining(remainingMs)}`;
          const icon = CROP_ICON[cropId] ?? "🌱";

          return (
            <div className="panelrow" key={cropId}>
              <div className="panelrow-icon">{plantedCrop ? icon : "🟫"}</div>
              <div className="panelrow-main">
                <div className="panelrow-title">Parcela de {econ.name.toLowerCase()}</div>
                <div className="panelrow-sub">{status}</div>
                <div className={`bar ${plantedCrop?.state === "ready" ? "good" : "warn"}`} style={{ width: "100%" }}>
                  <div style={{ width: `${Math.round(progress * 100)}%` }} />
                </div>
              </div>
              <div className="panelrow-side">
                <b>
                  {plantedCrop?.state === "ready"
                    ? "¡Lista!"
                    : plantedCrop
                      ? formatRemaining(remainingMs)
                      : "—"}
                </b>
              </div>
            </div>
          );
        })}
        <div className="empty">
          {ready} lista{ready === 1 ? "" : "s"} · {growing} en crecimiento.
        </div>
      </PanelSection>

      <div className="hint">
        En 3D: clic en la parcela para sembrar, clic sobre el cultivo listo para cosechar. Semillas y
        cosechas en inventario no cuentan como USD hasta venderlas.
      </div>
    </PanelShell>
  );
}
