import { useState } from "react";
import { useShopStore, capacityFor } from "../../store/shopStore";
import { useFarmStore } from "../../store/farmStore";
import { useUpgradesStore } from "../../store/upgradesStore";
import { getAnimalEconomy } from "../../config/economy";
import type { AnimalKind } from "../../types";
import { StoreCard, QtyStepper, fmtMoney, type NotifyFn } from "./StoreUI";

const ANIMAL_ORDER: AnimalKind[] = ["chicken", "rooster", "cow", "pig"];

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
  const [infoOpen, setInfoOpen] = useState(false);

  if (!def) return null;

  const cap = capacityFor(kind);
  const free = Math.max(0, cap.capacity - cap.used);
  const cost = def.price * qty;

  return (
    <StoreCard className="scard-animal">
      <button
        className="scard-info-btn"
        aria-label={`Más información de ${def.name}`}
        title="Información adicional"
        onClick={() => setInfoOpen((v) => !v)}
      >
        i
      </button>
      <div className="scard-icon">{def.icon}</div>
      <div className="scard-title">{def.name.toUpperCase()}</div>
      <div className="scard-tags">
        <span className="scard-tag">{def.production}</span>
        <span className="scard-tag">
          {BUILDING_NAME[kind]}: {cap.used}/{cap.capacity}
        </span>
      </div>
      <div className="scard-detail">
        Alimentación <b className="scard-price">{fmtMoney(def.feedCost)}</b> / {def.feedPeriod}
      </div>
      {infoOpen && (
        <div className="scard-info-box">
          Precio de compra <b>{fmtMoney(def.price)}</b>. Tratamiento veterinario{" "}
          <b>{fmtMoney(def.treatmentCost)}</b>. El mantenimiento se cobra al finalizar cada ciclo.
        </div>
      )}
      <QtyStepper value={qty} onChange={setQty} max={Math.max(1, free)} />
      <div className="scard-total">
        {qty} × {fmtMoney(def.price)} = <b>{fmtMoney(cost)}</b>
      </div>
      {free < 1 && <div className="scard-warn">🚧 Edificio lleno — mejóralo en INFRAESTRUCTURA.</div>}
      <div className="scard-actions">
        <button
          className="buybtn"
          disabled={free < 1}
          onClick={() => notify(useShopStore.getState().buyAnimal(kind, qty), def.icon)}
        >
          COMPRAR
        </button>
      </div>
    </StoreCard>
  );
}
