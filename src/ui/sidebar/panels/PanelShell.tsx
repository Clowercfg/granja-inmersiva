import type { ReactNode } from "react";
import { useUiStore } from "../../../store/uiStore";
import { useT } from "../../../store/languageStore";

export function PanelShell({
  icon,
  title,
  subtitle,
  children,
}: {
  icon: string;
  title: string;
  subtitle?: string;
  children: ReactNode;
}) {
  const t = useT();
  return (
    <>
      <div className="sidepanel-head">
        <span className="sidepanel-title">
          {icon} {title}
        </span>
        <button
          className="sidepanel-close"
          onClick={() => useUiStore.getState().closeSection()}
          aria-label={t("panel.close_aria")}
        >
          ✕
        </button>
      </div>
      {subtitle && <div className="sidepanel-sub">{subtitle}</div>}
      <div className="sidepanel-body">{children}</div>
    </>
  );
}

export function StatCell({ icon, label, value }: { icon: string; label: string; value: string | number }) {
  return (
    <div className="statcell">
      <span className="statcell-icon">{icon}</span>
      <span className="statcell-value">{value}</span>
      <span className="statcell-label">{label}</span>
    </div>
  );
}

export function PanelSection({ icon, title, children }: { icon: string; title: string; children: ReactNode }) {
  return (
    <div className="pansection">
      <div className="pansection-head">
        <span className="pansection-title">
          {icon} {title}
        </span>
      </div>
      <div className="pansection-body">{children}</div>
    </div>
  );
}
