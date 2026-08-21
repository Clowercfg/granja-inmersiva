import { createPortal } from "react-dom";
import { useUiStore, type GameSectionId } from "../store/uiStore";
import { useT } from "../store/languageStore";

const TABS: Array<{ id: GameSectionId; icon: string; labelKey: string }> = [
  { id: "crops", icon: "🌾", labelKey: "sidebar.crops" },
  { id: "animals", icon: "🐄", labelKey: "sidebar.animals" },
  { id: "processing", icon: "🏭", labelKey: "sidebar.processing" },
];

export function BottomBar() {
  const section = useUiStore((s) => s.section);
  const toggle = useUiStore((s) => s.toggleSection);
  const t = useT();

  return createPortal(
    <div className="bottombar">
      {TABS.map((tab) => {
        const active = section === tab.id;
        return (
          <button
            key={tab.id}
            className={`bb-btn ${active ? "active" : ""}`}
            onClick={() => toggle(tab.id)}
          >
            <span className="bb-icon">{tab.icon}</span>
            <span className="bb-label">{t(tab.labelKey)}</span>
          </button>
        );
      })}
    </div>,
    document.body
  );
}
