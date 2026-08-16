import { useUpgradesStore } from "../../store/upgradesStore";
import { useEconomyStore } from "../../store/economyStore";
import { UPGRADES_ECONOMY, type BuildingUpgradeDef, type SpecialUpgradeDef } from "../../config/upgrades";
import { useT } from "../../store/languageStore";
import { StoreCard, fmtMoney, type NotifyFn } from "./StoreUI";
import type { ShopResult } from "../../store/shopStore";

const UNIT_KEY: Record<string, string> = {
  gallinas: "unit.hens",
  vacas: "unit.cows",
  cerdos: "unit.pigs",
  huevos: "unit.eggs",
  "u.": "unit.units",
  máquinas: "unit.machines",
};

function unitLabel(
  unit: string,
  t: (key: string, params?: Record<string, string | number>) => string
): string {
  return t(UNIT_KEY[unit] ?? "unit.units");
}

/**
 * MEJORAS: cada tarjeta muestra nivel actual, siguiente nivel, precio,
 * beneficio y botón MEJORAR. Usa la misma lógica que el panel de
 * infraestructura (upgradesStore).
 */
export function UpgradeCards({ notify }: { notify: NotifyFn }) {
  return (
    <div className="store-grid">
      {Object.values(UPGRADES_ECONOMY).map((def) => (
        <BuildingCard key={def.id} def={def} notify={notify} />
      ))}
    </div>
  );
}

function BuildingCard({ def, notify }: { def: BuildingUpgradeDef; notify: NotifyFn }) {
  const t = useT();
  const level = useUpgradesStore((s) => s.levels[def.id]);
  const gold = useEconomyStore((s) => s.gold);
  const capacity = useUpgradesStore((s) => s.capacityOf(def.id));
  const buyLevel = useUpgradesStore((s) => s.buyLevel);

  const cur = def.levels.find((l) => l.level === level);
  const next = def.levels.find((l) => l.level === level + 1) ?? null;
  const atMax = !next;
  const nextCapacity = next?.capacity ?? capacity;
  const name = t(`upgrade.${def.id}`);
  const unit = unitLabel(def.unit, t);

  const benefit =
    def.type === "capacity"
      ? t("store.upgrade.benefit_capacity", { a: capacity, b: next ? nextCapacity : capacity, unit })
      : def.type === "speed"
        ? t("store.upgrade.benefit_speed")
        : t("store.upgrade.benefit_efficiency");

  const onBuy = () => {
    const ok = buyLevel(def.id);
    notify(
      ok
        ? {
            ok: true,
            message: t("store.upgrade.msg_upgraded", { name: name.toUpperCase() }),
            detail: t("store.upgrade.msg_level", { level: level + 1 }),
            fxLabel: name,
          }
        : insufficientUpgrade(next?.price ?? 0, t),
      def.icon
    );
  };

  return (
    <StoreCard className="scard-upgrade">
      <div className="scard-icon">{def.icon}</div>
      <div className="scard-title">{name.toUpperCase()}</div>
      <div className="scard-tags">
        <span className="scard-tag">{t("store.upgrade.level", { level })}</span>
        <span className="scard-tag">
          {atMax ? t("store.upgrade.max") : t("store.upgrade.next", { level: next!.level })}
        </span>
      </div>
      <div className="scard-detail">
        <b>{benefit}</b>
      </div>
      <div className="scard-total">
        {atMax ? t("store.upgrade.completed") : (<>{t("store.upgrade.price")} <b>{fmtMoney(next!.price)}</b></>)}
      </div>
      <button className="buybtn" disabled={atMax || gold < (next?.price ?? 0)} onClick={onBuy}>
        {t("store.upgrade.mejorar")}
      </button>

      {def.specials.length > 0 && (
        <div className="scard-specials">
          {def.specials.map((sp) => (
            <SpecialRow key={sp.id} special={sp} notify={notify} />
          ))}
        </div>
      )}
    </StoreCard>
  );
}

function SpecialRow({ special, notify }: { special: SpecialUpgradeDef; notify: NotifyFn }) {
  const t = useT();
  const owned = useUpgradesStore((s) => s.specials[special.id] === true);
  const gold = useEconomyStore((s) => s.gold);
  const buySpecial = useUpgradesStore((s) => s.buySpecial);

  const onBuy = () => {
    const ok = buySpecial(special.id);
    notify(
      ok
        ? {
            ok: true,
            message: `✓ ${t(`upgrade.special.${special.id}`).toUpperCase()}`,
            detail: t(`upgrade.special.${special.id}.desc`),
            fxLabel: t(`upgrade.special.${special.id}`),
          }
        : insufficientUpgrade(special.price, t),
      special.icon
    );
  };

  return (
    <div className="scard-special">
      <div className="sp-row">
        <span className="sp-icon">{special.icon}</span>
        <span className="sp-info">
          <span className="sp-name">{t(`upgrade.special.${special.id}`)}</span>
          <span className="sp-desc">{t(`upgrade.special.${special.id}.desc`)}</span>
        </span>
      </div>
      <button
        className="buybtn buybtn-sm"
        disabled={owned || gold < special.price}
        onClick={onBuy}
      >
        {owned ? t("store.upgrade.owned") : t("store.upgrade.buy_special", { price: fmtMoney(special.price) })}
      </button>
    </div>
  );
}

function insufficientUpgrade(
  cost: number,
  t: (key: string, params?: Record<string, string | number>) => string
): ShopResult {
  return {
    ok: false,
    message: t("store.upgrade.msg_insufficient"),
    detail: t("store.upgrade.msg_insufficient_detail", { money: fmtMoney(cost) }),
  };
}
