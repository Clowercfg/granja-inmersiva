import { useEffect, useState } from "react";
import { useCropStore, growthProgressOf, growthMsOf } from "../../../store/cropStore";
import { useEconomyStore } from "../../../store/economyStore";
import { getCropEconomy } from "../../../config/economy";
import { PLOTS } from "../../../utils/terrain";
import { PanelShell, PanelSection, StatCell } from "./PanelShell";

const CARROT_PLOT = 2;
const CARROT_ID = "carrot";

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

  const econ = getCropEconomy(CARROT_ID);
  const inv = inventory[CARROT_ID] ?? { seeds: 0, harvest: 0 };
  const carrotPlot = planted.find((p) => p.plotIndex === CARROT_PLOT) ?? null;

  const growing = planted.filter((p) => p.state === "growing").length;
  const ready = planted.filter((p) => p.state === "ready").length;

  const canPlant = !carrotPlot && inv.seeds > 0;
  const canBuy = gold >= (econ?.seedPrice ?? 0);

  const remainingMs =
    carrotPlot && carrotPlot.state !== "ready"
      ? Math.max(0, growthMsOf(carrotPlot) - (Date.now() - carrotPlot.plantedAt))
      : 0;

  const plotStatus = !carrotPlot
    ? "Vacía — clic en la parcela para sembrar"
    : carrotPlot.state === "ready"
      ? "Lista para cosechar"
      : `Creciendo · quedan ${formatRemaining(remainingMs)}`;

  const plotProgress = carrotPlot ? growthProgressOf(carrotPlot) : 0;

  return (
    <PanelShell icon="🌾" title="Cultivos" subtitle="Zanahoria · siembra, crecimiento y venta">
      <div className="panel-grid">
        <StatCell icon="🧱" label="Parcelas" value={PLOTS.length} />
        <StatCell icon="🌱" label="Semillas" value={inv.seeds} />
        <StatCell icon="🧺" label="Cosecha" value={inv.harvest} />
        <StatCell icon="💵" label="USD" value={gold.toFixed(2)} />
      </div>

      <PanelSection icon="🥕" title="Zanahoria">
        <div className="panelrow">
          <div className="panelrow-icon">🥕</div>
          <div className="panelrow-main">
            <div className="panelrow-title">Zanahoria</div>
            <div className="panelrow-sub">
              Semilla ${econ?.seedPrice.toFixed(2)} · Crecimiento {econ?.growthHours} h · Venta $
              {econ?.sellPrice.toFixed(4)} · Ganancia ${econ?.profitPerUnit.toFixed(4)}
            </div>
          </div>
        </div>

        <div className="panelrow-actions">
          <button
            className="btn small"
            disabled={!canBuy}
            onClick={() => buySeed(CARROT_ID)}
          >
            Comprar semilla
          </button>
          <button
            className="btn small primary"
            disabled={!canPlant}
            onClick={() => plantCrop(CARROT_ID, CARROT_PLOT)}
          >
            Sembrar
          </button>
          <button
            className="btn small"
            disabled={carrotPlot?.state !== "ready"}
            onClick={() => carrotPlot && harvestCrop(carrotPlot.id)}
          >
            Cosechar
          </button>
          <button
            className="btn small"
            disabled={inv.harvest < 1}
            onClick={() => sellHarvest(CARROT_ID, 1)}
          >
            Vender 1
          </button>
          <button
            className="btn small"
            disabled={inv.harvest < 1}
            onClick={() => sellHarvest(CARROT_ID, inv.harvest)}
          >
            Vender todo
          </button>
        </div>
        <div className="muted">Cada semilla cuesta ${econ?.seedPrice.toFixed(2)} (se descuenta al comprar).</div>
      </PanelSection>

      <PanelSection icon="🌿" title="Crecimiento">
        <div className="panelrow">
          <div className="panelrow-icon">{carrotPlot ? "🥕" : "🟫"}</div>
          <div className="panelrow-main">
            <div className="panelrow-title">Parcela de zanahoria</div>
            <div className="panelrow-sub">{plotStatus}</div>
            <div className={`bar ${carrotPlot?.state === "ready" ? "good" : "warn"}`} style={{ width: "100%" }}>
              <div style={{ width: `${Math.round(plotProgress * 100)}%` }} />
            </div>
          </div>
          <div className="panelrow-side">
            <b>
              {carrotPlot?.state === "ready"
                ? "¡Lista!"
                : carrotPlot
                  ? formatRemaining(remainingMs)
                  : "—"}
            </b>
          </div>
        </div>
        <div className="empty">
          {ready} lista{ready === 1 ? "" : "s"} · {growing} en crecimiento.
        </div>
      </PanelSection>

      <div className="hint">
        En 3D: clic en la parcela de zanahoria para sembrar, clic sobre el cultivo listo para
        cosechar. Semillas y cosechas en inventario no cuentan como oro hasta venderlas.
      </div>
    </PanelShell>
  );
}
