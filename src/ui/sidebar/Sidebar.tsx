import { useRef } from "react";
import { useUiStore, type GameSectionId } from "../../store/uiStore";
import { useT } from "../../store/languageStore";
import { AnimalsPanel } from "./panels/AnimalsPanel";
import { VetPanel } from "./panels/VetPanel";
import { CropsPanel } from "./panels/CropsPanel";
import { UpgradesPanel } from "./panels/UpgradesPanel";
import { InventoryPanel } from "./panels/InventoryPanel";
import { CalendarPanel } from "./panels/CalendarPanel";
import { LanguagePanel } from "./panels/LanguagePanel";

const SECTIONS: Array<{ id: GameSectionId; labelKey: string; hintKey: string; icon: string }> = [
  { id: "animals", labelKey: "sidebar.animals", hintKey: "sidebar.animals_hint", icon: "🐄" },
  { id: "veterinary", labelKey: "sidebar.veterinary", hintKey: "sidebar.veterinary_hint", icon: "🩺" },
  { id: "crops", labelKey: "sidebar.crops", hintKey: "sidebar.crops_hint", icon: "🌾" },
  { id: "upgrades", labelKey: "sidebar.upgrades", hintKey: "sidebar.upgrades_hint", icon: "🏗️" },
  { id: "inventory", labelKey: "sidebar.inventory", hintKey: "sidebar.inventory_hint", icon: "📦" },
  { id: "calendar", labelKey: "sidebar.calendar", hintKey: "sidebar.calendar_hint", icon: "📅" },
  { id: "language", labelKey: "sidebar.language", hintKey: "sidebar.language_hint", icon: "🌐" },
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
    case "language":
      return <LanguagePanel />;
  }
}

export function Sidebar() {
  const section = useUiStore((s) => s.section);
  const storeOpen = useUiStore((s) => s.storeOpen);
  const toggle = useUiStore((s) => s.toggleSection);
  const toggleStore = useUiStore((s) => s.toggleStore);
  const t = useT();
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
          title={t("sidebar.store_title")}
        >
          <span className="sbtn-icon">🛒</span>
          <span className="sbtn-label">{t("sidebar.store")}</span>
        </button>
        <div className="rail-sep" />
        {SECTIONS.map((s) => {
          const active = section === s.id;
          return (
            <button
              key={s.id}
              className={`sbtn ${active ? "active" : ""}`}
              onClick={() => toggle(s.id)}
              title={`${t(s.labelKey)} — ${t(s.hintKey)}`}
            >
              <span className="sbtn-icon">{s.icon}</span>
              <span className="sbtn-label">{t(s.labelKey)}</span>
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
