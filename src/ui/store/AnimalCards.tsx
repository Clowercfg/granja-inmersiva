import { useState } from "react";
import { useShopStore, capacityFor } from "../../store/shopStore";
import { useFarmStore } from "../../store/farmStore";
import { useUpgradesStore } from "../../store/upgradesStore";
import { getAnimalEconomy } from "../../config/economy";
import { useT } from "../../store/languageStore";
import type { AnimalKind } from "../../types";
import { StoreCard, QtyStepper, fmtMoney, type NotifyFn } from "./StoreUI";

const ANIMAL_ORDER: AnimalKind[] = ["chicken", "rooster", "cow", "pig"];

const BUILDING_OF_KIND: Record<AnimalKind, string> = {
  chicken: "coop",
  rooster: "coop",
  cow: "stable",
  pig: "pigPen",
};

export function AnimalCards({ notify }: { notify: NotifyFn }) {
  return (
    <div className="store-grid">
      {ANIMAL_ORDER.map((kind) => (
        <AnimalCard key={kind} kind={kind} notify={notify} />
      ))}
    </div>
  );
}

function AnimalCard({ kind, notify }: { kind: AnimalKind; notify: NotifyFn }) {
  const t = useT();
  const def = getAnimalEconomy(kind);
  useFarmStore((s) => s.animals.length);
  useUpgradesStore((s) => s.levels["coop"] + ":" + s.levels["stable"] + ":" + s.levels["pigPen"]);
  const [qty, setQty] = useState(1);
  const [infoOpen, setInfoOpen] = useState(false);

  if (!def) return null;

  const cap = capacityFor(kind);
  const free = Math.max(0, cap.capacity - cap.used);
  const cost = def.price * qty;
  const name = t(`animal.${kind}`);
  const buildingName = t(`building.${BUILDING_OF_KIND[kind]}`);

  return (
    <StoreCard className="scard-animal">
      <button
        className="scard-info-btn"
        aria-label={t("store.animal.info_aria", { name })}
        title={t("store.animal.info_title")}
        onClick={() => setInfoOpen((v) => !v)}
      >
        i
      </button>
      <div className="scard-icon">{def.icon}</div>
      <div className="scard-title">{name.toUpperCase()}</div>
      <div className="scard-tags">
        <span className="scard-tag">{t(`animal.production.${kind}`)}</span>
        <span className="scard-tag">
          {t("store.animal.building_fill", {
            building: buildingName,
            used: cap.used,
            capacity: cap.capacity,
          })}
        </span>
      </div>
      <div className="scard-detail">
        {t("store.animal.feed")} <b className="scard-price">{fmtMoney(def.feedCost)}</b> /{" "}
        {t(`feedPeriod.${def.feedPeriod === "día" ? "day" : "cycle"}`)}
      </div>
      {infoOpen && (
        <div className="scard-info-box">
          {t("store.animal.info_box", {
            price: fmtMoney(def.price),
            treat: fmtMoney(def.treatmentCost),
          })}
        </div>
      )}
      <QtyStepper value={qty} onChange={setQty} max={Math.max(1, free)} />
      <div className="scard-total">
        {qty} × {fmtMoney(def.price)} = <b>{fmtMoney(cost)}</b>
      </div>
      {free < 1 && <div className="scard-warn">{t("store.animal.full")}</div>}
      <div className="scard-actions">
        <button
          className="buybtn"
          disabled={free < 1}
          onClick={() => notify(useShopStore.getState().buyAnimal(kind, qty), def.icon)}
        >
          {t("store.buy")}
        </button>
      </div>
    </StoreCard>
  );
}
