import { useEffect, useRef, useState } from "react";
import { useUpgradesStore } from "../../../store/upgradesStore";
import { useEconomyStore } from "../../../store/economyStore";
import { UPGRADE_BUILDINGS, type BuildingUpgradeDef, type SpecialUpgradeDef } from "../../../config/upgrades";
import { useT } from "../../../store/languageStore";
import { PanelShell, StatCell } from "./PanelShell";

const UNIT_KEY: Record<string, string> = {
  gallinas: "unit.hens",
  vacas: "unit.cows",
  cerdos: "unit.pigs",
  huevos: "unit.eggs",
  "u.": "unit.units",
  máquinas: "unit.machines",
};

function fmtPrice(v: number, t: (key: string) => string): string {
  if (v === 0) return t("panel.upgrades.free");
  return "$" + v.toFixed(2).replace(/\.00$/, "");
}

function paybackDays(price: number, gain: number | undefined): number | null {
  if (!gain || gain <= 0 || price <= 0) return null;
  return Math.max(1, Math.ceil(price / gain));
}

function SpecialRow({ building, special }: { building: BuildingUpgradeDef; special: SpecialUpgradeDef }) {
  const t = useT();
  const bought = useUpgradesStore((s) => !!s.specials[special.id]);
  const gold = useEconomyStore((s) => s.gold);
  const missing = Math.max(0, special.price - gold);
  const roi = paybackDays(special.price, special.estDailyGain);

  return (
    <div className={`panelrow upgrade-special ${bought ? "owned" : ""}`}>
      <div className="panelrow-icon">{special.icon}</div>
      <div className="panelrow-main">
        <div className="panelrow-title">
          {t(`upgrade.special.${special.id}`)}{" "}
          <span className={`status-chip ${bought ? "status-ok" : "status-idle"}`}>
            {bought ? t("panel.upgrades.owned_chip") : t(`panel.upgrades.type.${special.type}`)}
          </span>
        </div>
        <div className="panelrow-sub">{t(`upgrade.special.${special.id}.desc`)}</div>
        {roi !== null && (
          <div className="panelrow-sub muted">{t("panel.upgrades.roi", { days: roi })}</div>
        )}
      </div>
      <div className="panelrow-side">
        <b>{fmtPrice(special.price, t)}</b>
        {!bought && missing > 0 && <span className="muted">{t("panel.upgrades.missing", { money: fmtPrice(missing, t) })}</span>}
      </div>
      <div className="panelrow-actions">
        <button
          className="btn small primary"
          disabled={bought || missing > 0}
          onClick={() => useUpgradesStore.getState().buySpecial(special.id)}
        >
          {bought ? t("panel.upgrades.bought_btn") : t("panel.upgrades.buy")}
        </button>
      </div>
    </div>
  );
}

function BuildingCard({ def }: { def: BuildingUpgradeDef }) {
  const t = useT();
  const level = useUpgradesStore((s) => s.levels[def.id]);
  const gold = useEconomyStore((s) => s.gold);
  const [, setTick] = useState(0);
  const confirmRef = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    const iv = setInterval(() => setTick((t) => t + 1), 1000);
    return () => clearInterval(iv);
  }, []);

  const nextDef = level >= def.levels.length ? null : (def.levels.find((l) => l.level === level + 1) ?? null);
  const curDef = def.levels.find((l) => l.level === level);
  const capacity = curDef?.capacity ?? 0;
  const nextCapacity = nextDef?.capacity ?? capacity;
  const atMax = nextDef === null;
  const price = nextDef?.price ?? 0;
  const missing = atMax ? 0 : Math.max(0, price - gold);
  const delta = atMax ? 0 : Math.max(0, nextCapacity - capacity);
  const gain = atMax ? undefined : def.estDailyGainPerUnit * delta;
  const roi = paybackDays(price, atMax ? undefined : gain);
  const unit = t(UNIT_KEY[def.unit] ?? "unit.units");
  const name = t(`upgrade.${def.id}`);

  const onBuy = () => {
    if (useUpgradesStore.getState().buyLevel(def.id) && confirmRef.current) {
      confirmRef.current.textContent = t("panel.upgrades.confirm", {
        name,
        level: useUpgradesStore.getState().levels[def.id],
      });
      setTimeout(() => {
        if (confirmRef.current) confirmRef.current.textContent = "";
      }, 3000);
    }
  };

  return (
    <div className="pansection upgrade-card">
      <div className="pansection-head">
        <span className="pansection-title">
          {def.icon} {name.toUpperCase()}
        </span>
        <span className="upgrade-level">
          {nextDef
            ? t("panel.upgrades.level_range", { a: level, b: nextDef.level })
            : t("panel.upgrades.level_max", { a: level })}
        </span>
      </div>
      <div className="pansection-body">
        <div className="panelrow">
          <div className="panelrow-icon">{def.icon}</div>
          <div className="panelrow-main">
            <div className="panelrow-title">
              {t("panel.upgrades.capacity_line", { a: capacity, b: atMax ? capacity : nextCapacity, unit })}
            </div>
            <div className="panelrow-sub">
              {atMax
                ? t("panel.upgrades.max_reached")
                : t("panel.upgrades.benefit", { delta, unit })}
            </div>
            {!atMax && roi !== null && (
              <div className="panelrow-sub muted">{t("panel.upgrades.roi", { days: roi })}</div>
            )}
          </div>
          <div className="panelrow-side">
            <b>{fmtPrice(price, t)}</b>
            {!atMax && missing > 0 && <span className="muted">{t("panel.upgrades.missing", { money: fmtPrice(missing, t) })}</span>}
          </div>
          <div className="panelrow-actions">
            <button
              className="btn small primary"
              disabled={atMax || missing > 0}
              onClick={onBuy}
            >
              {atMax ? t("panel.upgrades.max") : `🏗️ ${t("panel.upgrades.buy")}`}
            </button>
          </div>
        </div>

        {def.specials.map((sp) => (
          <SpecialRow key={sp.id} building={def} special={sp} />
        ))}

        <span className="upgrade-confirm" ref={confirmRef} />
      </div>
    </div>
  );
}

export function UpgradesPanel() {
  const t = useT();
  const gold = useEconomyStore((s) => s.gold);
  const [, setTick] = useState(0);

  useEffect(() => {
    const iv = setInterval(() => setTick((t) => t + 1), 1000);
    return () => clearInterval(iv);
  }, []);

  const purchased = useUpgradesStore((s) =>
    UPGRADE_BUILDINGS.reduce((acc, d) => acc + (s.levels[d.id] - d.startLevel), 0) +
    Object.values(s.specials).filter(Boolean).length
  );

  return (
    <PanelShell icon="🏗️" title={t("panel.upgrades.title")} subtitle={t("panel.upgrades.subtitle")}>
      <div className="panel-grid">
        <StatCell icon="💰" label={t("panel.upgrades.balance")} value={"$" + gold.toFixed(2).replace(/\.00$/, "")} />
        <StatCell icon="🏗️" label={t("panel.upgrades.upgradeable")} value={UPGRADE_BUILDINGS.length} />
        <StatCell icon="📈" label={t("panel.upgrades.bought")} value={purchased} />
      </div>

      <div className="hint">{t("panel.upgrades.hint_1")}</div>

      {UPGRADE_BUILDINGS.map((def) => (
        <BuildingCard key={def.id} def={def} />
      ))}

      <div className="hint">{t("panel.upgrades.hint_2")}</div>
    </PanelShell>
  );
}
