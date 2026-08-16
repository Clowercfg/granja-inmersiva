import { useRef } from "react";
import { useUiStore, type GameSectionId } from "../../store/uiStore";
import { AnimalsPanel } from "./panels/AnimalsPanel";
import { VetPanel } from "./panels/VetPanel";
import { CropsPanel } from "./panels/CropsPanel";
import { UpgradesPanel } from "./panels/UpgradesPanel";
import { InventoryPanel } from "./panels/InventoryPanel";
import { CalendarPanel } from "./panels/CalendarPanel";

const SECTIONS: Array<{ id: GameSectionId; label: string; icon: string; hint: string }> = [
  { id: "animals", label: "Animales", icon: "🐄", hint: "Población y estado" },
  { id: "veterinary", label: "Veterinario", icon: "🩺", hint: "Salud y tratamientos" },
  { id: "crops", label: "Cultivos", icon: "🌾", hint: "Parcelas y cosechas" },
  { id: "upgrades", label: "Mejoras", icon: "🏗️", hint: "Niveles y capacidades" },
  { id: "inventory", label: "Inventario", icon: "📦", hint: "Materiales y recursos" },
  { id: "calendar", label: "Calendario", icon: "📅", hint: "Fecha real y estación" },
];

function PanelContent({ id }: { id: GameSectionId }) {
  switch (id) {
    case "animals":
      return <AnimalsPanel />;
    case "veterinary":
      return <VetPanel />;
    case "crops":
      return <CropsPanel />;
    case "upgrades":
      return <UpgradesPanel />;
    case "inventory":
      return <InventoryPanel />;
    case "calendar":
      return <CalendarPanel />;
  }
}

export function Sidebar() {
  const section = useUiStore((s) => s.section);
  const storeOpen = useUiStore((s) => s.storeOpen);
  const toggle = useUiStore((s) => s.toggleSection);
  const toggleStore = useUiStore((s) => s.toggleStore);
  const last = useRef<GameSectionId | null>(null);
  if (section) last.current = section;
  const open = section !== null;
  const contentId = section ?? last.current;

  return (
    <div className="sidebar">
      <div className="sidebar-rail">
        <button
          className={`sbtn sbtn-store ${storeOpen ? "active" : ""}`}
          onClick={toggleStore}
          title="Tienda — compra todo para tu granja"
        >
          <span className="sbtn-icon">🛒</span>
          <span className="sbtn-label">Tienda</span>
        </button>
        <div className="rail-sep" />
        {SECTIONS.map((s) => {
          const active = section === s.id;
          return (
            <button
              key={s.id}
              className={`sbtn ${active ? "active" : ""}`}
              onClick={() => toggle(s.id)}
              title={`${s.label} — ${s.hint}`}
            >
              <span className="sbtn-icon">{s.icon}</span>
              <span className="sbtn-label">{s.label}</span>
            </button>
          );
        })}
      </div>
      <div className={`sidepanel ${open ? "open" : ""}`}>
        {contentId && <PanelContent key={contentId} id={contentId} />}
      </div>
    </div>
  );
}
