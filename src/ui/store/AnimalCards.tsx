import { useState } from "react";
import { useShopStore, capacityFor } from "../../store/shopStore";
import { useFarmStore } from "../../store/farmStore";
import { useUpgradesStore } from "../../store/upgradesStore";
import { getAnimalEconomy } from "../../config/economy";
import type { AnimalKind } from "../../types";
import { StoreCard, QtyStepper, fmtMoney, type NotifyFn } from "./StoreUI";

const ANIMAL_ORDER: AnimalKind[] = ["chicken", "rooster", "cow", "pig"];

const PRODUCTION_INFO: Record<AnimalKind, string> = {
  chicken: "Produce huevos",
  rooster: "Produce huevos fertilizados",
  cow: "Produce leche",
  pig: "Produce carne",
};

const BUILDING_NAME: Record<AnimalKind, string> = {
  chicken: "Gallinero",
  rooster: "Gallinero",
  cow: "Establo",
  pig: "Pocilga",
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
  const def = getAnimalEconomy(kind);
  useFarmStore((s) => s.animals.length);
  useUpgradesStore((s) => s.levels["coop"] + ":" + s.levels["stable"] + ":" + s.levels["pigPen"]);
  const [qty, setQty] = useState(1);

  if (!def) return null;

  const cap = capacityFor(kind);
  const free = Math.max(0, cap.capacity - cap.used);
  const cost = def.price * qty;

  return (
    <StoreCard className="scard-animal">
      <div className="scard-icon">{def.icon}</div>
      <div className="scard-title">{def.name.toUpperCase()}</div>
      <div className="scard-tags">
        <span className="scard-tag">{PRODUCTION_INFO[kind]}</span>
        <span className="scard-tag">
          {BUILDING_NAME[kind]}: {cap.used}/{cap.capacity}
        </span>
      </div>
      <div className="scard-detail">Precio unitario <b>{fmtMoney(def.price)}</b></div>
      <QtyStepper value={qty} onChange={setQty} max={Math.max(1, free)} />
      <div className="scard-total">
        {qty} × {fmtMoney(def.price)} = <b>{fmtMoney(cost)}</b>
      </div>
      {free < 1 && <div className="scard-warn">🚧 Edificio lleno — mejóralo en la categoría MEJORAS.</div>}
      <button
        className="buybtn"
        disabled={free < 1}
        onClick={() => notify(useShopStore.getState().buyAnimal(kind, qty), def.icon)}
      >
        COMPRAR
      </button>
    </StoreCard>
  );
}
