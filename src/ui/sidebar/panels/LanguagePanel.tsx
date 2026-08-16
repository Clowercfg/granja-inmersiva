import { useLanguageStore, type Lang } from "../../../store/languageStore";
import { PanelShell } from "./PanelShell";

const OPTIONS: Array<{ id: Lang; labelKey: string; flag: string }> = [
  { id: "es", labelKey: "language.es", flag: "🇪🇸" },
  { id: "en", labelKey: "language.en", flag: "🇺🇸" },
];

export function LanguagePanel() {
  const lang = useLanguageStore((s) => s.lang);
  const setLang = useLanguageStore((s) => s.setLang);
  const t = useLanguageStore((s) => s.t);

  return (
    <PanelShell icon="🌐" title={t("language.title")} subtitle={t("language.subtitle")}>
      <div className="panel-grid lang-grid">
        {OPTIONS.map((opt) => {
          const active = lang === opt.id;
          return (
            <button
              key={opt.id}
              className={`lang-btn ${active ? "active" : ""}`}
              onClick={() => setLang(opt.id)}
            >
              <span className="lang-flag">{opt.flag}</span>
              <span className="lang-name">{t(opt.labelKey)}</span>
              <span className="lang-check">{active ? "✓" : ""}</span>
            </button>
          );
        })}
      </div>
      <div className="hint">{t("sidebar.language_hint")}</div>
    </PanelShell>
  );
}
