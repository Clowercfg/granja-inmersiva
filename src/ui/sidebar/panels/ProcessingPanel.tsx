import { useEffect, useState, useCallback, useMemo } from "react";
import { useProcessingStore, type ProcessingJob } from "../../../store/processingStore";
import { useGoodsStore } from "../../../store/goodsStore";
import { useEconomyStore } from "../../../store/economyStore";
import { useUpgradesStore } from "../../../store/upgradesStore";
import { getProcessorLevelDef, UPGRADES_ECONOMY } from "../../../config/upgrades";
import { PROCESS_ECONOMY } from "../../../config/processing";
import { getProductEconomy } from "../../../config/economy";
import { useT } from "../../../store/languageStore";
import { PanelShell, PanelSection, StatCell } from "./PanelShell";
import { QtyStepper, fmtMoney } from "../../store/StoreUI";

function formatRemaining(ms: number): string {
  const totalMin = Math.max(0, Math.ceil(ms / 60000));
  const h = Math.floor(totalMin / 60);
  const m = totalMin % 60;
  return `${h}h ${m}m`;
}

export function ProcessingPanel() {
  const t = useT();
  const [, setTick] = useState(0);
  useEffect(() => {
    const iv = setInterval(() => setTick((v) => v + 1), 1000);
    return () => clearInterval(iv);
  }, []);

  const level = useUpgradesStore((s) => s.capacityOf("processing"));
  const upgradeLevels = useUpgradesStore((s) => s.levels);
  const buyLevel = useUpgradesStore((s) => s.buyLevel);
  const gold = useEconomyStore((s) => s.gold);
  const eggs = useGoodsStore((s) => s.inventory["eggs"] ?? 0);
  const boiledEggs = useGoodsStore((s) => s.inventory["boiled-eggs"] ?? 0);
  const jobs = useProcessingStore((s) => s.jobs);
  const startProcess = useProcessingStore((s) => s.startProcess);

  const def = getProcessorLevelDef(level);
  const output = getProductEconomy("boiled-egg");
  const input = getProductEconomy("egg");

  const [qty, setQty] = useState(1);
  const maxQty = Math.min(def.capacity, eggs);

  useEffect(() => {
    setQty((prev) => Math.max(1, Math.min(prev, maxQty)));
  }, [maxQty]);

  const totalCost = qty * def.costPerEgg;
  const saleValue = (output?.price ?? 0.07) * qty;
  const profit = saleValue - totalCost - (input?.price ?? 0.05) * qty;

  const nextLevelData = useMemo(() => {
    const procDef = UPGRADES_ECONOMY.processing;
    const curLevel = upgradeLevels["processing"] ?? procDef.startLevel;
    const next = procDef.levels.find((l) => l.level === curLevel + 1);
    if (!next) return null;
    return { level: next.level, price: next.price, def: getProcessorLevelDef(next.level) };
  }, [upgradeLevels]);

  const canStart = useMemo(() => {
    if (level <= 0) return false;
    if (qty <= 0 || qty > def.capacity) return false;
    if (eggs < qty) return false;
    const totalCostCheck = qty * def.costPerEgg;
    if (gold < totalCostCheck) return false;
    return true;
  }, [level, qty, def, eggs, gold]);

  const handleProcess = useCallback(() => {
    if (!canStart) return;
    const ok = startProcess("egg-boiled", qty);
    if (ok) setQty(1);
  }, [startProcess, qty, canStart]);

  const disableReason = useMemo(() => {
    if (level <= 0) return "no_processor";
    if (eggs < qty) return "no_eggs";
    if (gold < totalCost) return "no_balance";
    if (qty > def.capacity) return "exceeds_capacity";
    return null;
  }, [level, eggs, qty, gold, totalCost, def]);

  return (
    <PanelShell
      icon="🏭"
      title={t("panel.processing.title")}
      subtitle={t("panel.processing.subtitle")}
    >
      <div className="panel-grid">
        <StatCell icon="📊" label={t("panel.processing.level", { level })} value={level > 0 ? level : "—"} />
        <StatCell icon="📦" label={t("panel.processing.capacity_label")} value={level > 0 ? (def.capacity + " huevos") : "—"} />
        <StatCell icon="⏱️" label={t("panel.processing.time")} value={level > 0 ? formatRemaining(def.processHours * 3600000) : "—"} />
        <StatCell icon="🥚" label="Huevos" value={eggs} />
        <StatCell icon="🍳" label="Hervidos" value={boiledEggs} />
        <StatCell icon="💵" label="USD" value={gold.toFixed(2)} />
      </div>

      {level <= 0 ? (
        <PanelSection icon="🔒" title={t("panel.processing.locked")}>
          <div className="muted">{t("panel.processing.locked_desc")}</div>
          {nextLevelData && (
            <button
              className="btn primary"
              disabled={gold < nextLevelData.price}
              onClick={() => buyLevel("processing")}
            >
              {t("panel.processing.unlock")} — {fmtMoney(nextLevelData.price)}
            </button>
          )}
        </PanelSection>
      ) : (
        <PanelSection icon="🥚" title={t("process.egg-boiled.title")}>
          <div className="panelrow">
            <div className="panelrow-icon">🥚→🍳</div>
            <div className="panelrow-main">
              <div className="panelrow-title">{t("product.egg")} → {t("product.boiled-egg")}</div>
              <div className="panelrow-sub">
                {t("panel.processing.time")}: {formatRemaining(def.processHours * 3600000)} · {t("panel.processing.cost_per_egg")}: {fmtMoney(def.costPerEgg)} · {t("panel.processing.sale_value")}: {fmtMoney(output?.price ?? 0.07)}
              </div>
            </div>
            <div className="panelrow-side">
              <b>{fmtMoney(profit > 0 ? profit : 0)}</b>
              <span className="muted">{t("panel.processing.profit")}</span>
            </div>
          </div>

          <div className="panelrow-actions" style={{ alignItems: "center", gap: 8 }}>
            <QtyStepper value={qty} onChange={setQty} min={1} max={maxQty > 0 ? maxQty : 1} />
            <span className="muted" style={{ fontSize: 12 }}>
              {qty} × {fmtMoney(def.costPerEgg)} = {fmtMoney(totalCost)}
            </span>
            <button
              className="btn primary"
              disabled={!canStart}
              onClick={handleProcess}
              title={
                disableReason === "no_eggs"
                  ? t("panel.processing.no_eggs")
                  : disableReason === "no_balance"
                    ? t("panel.processing.no_balance")
                    : disableReason === "exceeds_capacity"
                      ? t("panel.processing.at_capacity")
                      : undefined
              }
            >
              {t("panel.processing.start")}
            </button>
          </div>
        </PanelSection>
      )}

      {jobs.length > 0 && (
        <PanelSection icon="⏳" title={t("panel.processing.active")}>
          {jobs.map((job) => (
            <ActiveJob key={job.id} job={job} />
          ))}
        </PanelSection>
      )}

      {nextLevelData && level > 0 && (
        <PanelSection icon="⬆️" title={t("panel.processing.upgrade")}>
          <div className="panelrow">
            <div className="panelrow-main">
              <div className="panelrow-title">
                {t("panel.processing.next_level")} → Nivel {nextLevelData.level}
              </div>
              <div className="panelrow-sub">
                {t("panel.processing.benefit_capacity", { a: def.capacity, b: nextLevelData.def.capacity })} ·{" "}
                {t("panel.processing.benefit_time", { a: formatRemaining(def.processHours * 3600000), b: formatRemaining(nextLevelData.def.processHours * 3600000) })} ·{" "}
                {t("panel.processing.benefit_cost", { a: fmtMoney(def.costPerEgg), b: fmtMoney(nextLevelData.def.costPerEgg) })}
              </div>
            </div>
            <div className="panelrow-side">
              <button
                className="btn primary"
                disabled={gold < nextLevelData.price}
                onClick={() => buyLevel("processing")}
              >
                {t("panel.processing.buy")} — {fmtMoney(nextLevelData.price)}
              </button>
            </div>
          </div>
        </PanelSection>
      )}

      {level > 0 && (
        <PanelSection icon="📊" title={t("panel.processing.info_title")}>
          <div className="panelrow">
            <div className="panelrow-main">
              <div className="panelrow-sub">
                {t("panel.processing.info_egg")}: {fmtMoney(input?.price ?? 0.05)} ·{" "}
                {t("panel.processing.info_cost")}: {fmtMoney(def.costPerEgg)} ·{" "}
                {t("panel.processing.info_boiled")}: {fmtMoney(output?.price ?? 0.07)} ·{" "}
                <b>{t("panel.processing.info_profit")}: +{fmtMoney((output?.price ?? 0.07) - (input?.price ?? 0.05) - def.costPerEgg)}</b>
              </div>
            </div>
          </div>
        </PanelSection>
      )}

      <div className="hint">{t("panel.processing.hint")}</div>
    </PanelShell>
  );
}

function ActiveJob({ job }: { job: ProcessingJob }) {
  const t = useT();
  const eggs = useGoodsStore((s) => s.inventory["eggs"] ?? 0);
  const gold = useEconomyStore((s) => s.gold);
  const addToJob = useProcessingStore((s) => s.addToJob);
  const level = useUpgradesStore((s) => s.capacityOf("processing"));
  const def = getProcessorLevelDef(level);
  const now = Date.now();
  const remaining = Math.max(0, job.endTime - now);
  const progress = Math.min(1, 1 - remaining / (job.endTime - job.startTime));

  if (remaining <= 0) {
    return (
      <div className="panelrow">
        <div className="panelrow-icon">✅</div>
        <div className="panelrow-main">
          <div className="panelrow-title">{t("panel.processing.completed")}</div>
          <div className="panelrow-sub">{job.qty} {t("product.boiled-egg")}</div>
        </div>
      </div>
    );
  }

  const canAdd = eggs >= 1 && gold >= def.costPerEgg && job.qty < def.capacity;

  return (
    <div className="panelrow">
      <div className="panelrow-icon">🍳</div>
      <div className="panelrow-main">
        <div className="panelrow-title">{job.qty} {t("product.egg")}</div>
        <div className="panelrow-sub">⏱️ {formatRemaining(remaining)} {t("panel.processing.remaining")}</div>
        <div className="bar warn" style={{ width: "100%" }}>
          <div style={{ width: `${Math.round(progress * 100)}%` }} />
        </div>
      </div>
      <div className="panelrow-side" style={{ display: "flex", alignItems: "center", gap: 6 }}>
        <b>{formatRemaining(remaining)}</b>
        <button
          className="btn small primary"
          disabled={!canAdd}
          onClick={() => addToJob(job.id)}
          title={!canAdd
            ? eggs < 1
              ? t("panel.processing.no_eggs")
              : gold < def.costPerEgg
                ? t("panel.processing.no_balance")
                : t("panel.processing.at_capacity")
            : undefined
          }
        >
          +1
        </button>
      </div>
    </div>
  );
}
