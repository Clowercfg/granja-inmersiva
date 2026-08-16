import { useMemo } from "react";
import { useWorldStore } from "../../../store/worldStore";
import { useT } from "../../../store/languageStore";
import { PanelShell, StatCell, PanelSection } from "./PanelShell";

const SEASON_ICON: Record<string, string> = {
  spring: "🌸",
  summer: "☀️",
  autumn: "🍂",
  winter: "❄️",
};

const PHASE_ICON: Record<string, string> = {
  dawn: "🌅",
  morning: "🌤️",
  midday: "☀️",
  afternoon: "🌇",
  dusk: "🌆",
  night: "🌙",
};

function useNowMs() {
  // Fuerza re-render al cambiar la hora (cada minuto es suficiente para el calendario).
  const now = useWorldStore((s) => s.now);
  return useMemo(() => new Date(now), [now]);
}

export function CalendarPanel() {
  const t = useT();
  const d = useNowMs();
  const year = useWorldStore((s) => s.year);
  const month = useWorldStore((s) => s.month);
  const dayOfMonth = useWorldStore((s) => s.dayOfMonth);
  const season = useWorldStore((s) => s.season);
  const dayPhase = useWorldStore((s) => s.dayPhase);

  const firstWeekday = useMemo(() => new Date(year, month - 1, 1).getDay(), [year, month]);
  const daysInMonth = useMemo(() => new Date(year, month, 0).getDate(), [year, month]);
  const cells: Array<number | null> = useMemo(() => {
    const arr: Array<number | null> = [];
    for (let i = 0; i < firstWeekday; i++) arr.push(null);
    for (let i = 1; i <= daysInMonth; i++) arr.push(i);
    return arr;
  }, [firstWeekday, daysInMonth]);

  const dayProgress = ((d.getHours() * 60 + d.getMinutes()) / (24 * 60)) * 100;
  const dow = t(`time.weekday.${d.getDay()}`);
  const monthName = t(`time.month.${d.getMonth()}`);
  const shortWeek = useMemo(
    () => Array.from({ length: 7 }, (_, i) => t(`time.weekday_short.${i}`)),
    [t]
  );

  return (
    <PanelShell icon="📅" title={t("panel.calendar.title")} subtitle={t("panel.calendar.subtitle")}>
      <div className="calendar-today">
        <div className="calendar-date">{dow}</div>
        <div className="calendar-day">{t("time.date_cal", { day: dayOfMonth, month: monthName, year })}</div>
      </div>

      <div className="panel-grid">
        <StatCell icon={PHASE_ICON[dayPhase]} label={t("panel.calendar.moment")} value={t(`time.dayphase.${dayPhase}`)} />
        <StatCell icon={SEASON_ICON[season]} label={t("panel.calendar.season")} value={t(`time.season.${season}`)} />
      </div>

      <div className="calendar-progress">
        <div className="calendar-progress-label">{t("panel.calendar.day_progress")}</div>
        <div className="bar good" style={{ width: "100%" }}>
          <div style={{ width: `${dayProgress}%` }} />
        </div>
      </div>

      <PanelSection icon="🗓️" title={`${monthName} ${year}`}>
        <div className="calendar-grid">
          {shortWeek.map((wd, i) => (
            <div className="calendar-grid-head" key={i}>
              {wd}
            </div>
          ))}
          {cells.map((c, i) =>
            c === null ? (
              <div className="calendar-grid-cell blank" key={i} />
            ) : (
              <div
                className={`calendar-grid-cell ${c === dayOfMonth ? "today" : ""}`}
                key={i}
              >
                {c}
              </div>
            )
          )}
        </div>
      </PanelSection>

      <PanelSection icon="⭐" title={t("panel.calendar.events")}>
        <div className="empty">{t(`panel.calendar.ev.${season}`)}</div>
      </PanelSection>

      <div className="hint">{t("panel.calendar.hint")}</div>
    </PanelShell>
  );
}
