import { useMemo } from "react";
import { useWorldStore } from "../../../store/worldStore";
import { DAY_PHASE_LABEL, SEASON_LABEL } from "../../../systems/time/TimeManager";
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
  const d = useNowMs();
  const year = useWorldStore((s) => s.year);
  const month = useWorldStore((s) => s.month);
  const dayOfMonth = useWorldStore((s) => s.dayOfMonth);
  const dayOfWeek = useWorldStore((s) => s.dayOfWeek);
  const monthName = useWorldStore((s) => s.monthName);
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

  return (
    <PanelShell icon="📅" title="Calendario" subtitle="El tiempo de la granja sigue la hora real">
      <div className="calendar-today">
        <div className="calendar-date">{dayOfWeek}</div>
        <div className="calendar-day">
          {dayOfMonth} de {monthName} de {year}
        </div>
      </div>

      <div className="panel-grid">
        <StatCell icon={PHASE_ICON[dayPhase]} label="Momento" value={DAY_PHASE_LABEL[dayPhase]} />
        <StatCell icon={SEASON_ICON[season]} label="Estación" value={SEASON_LABEL[season]} />
      </div>

      <div className="calendar-progress">
        <div className="calendar-progress-label">Avance del día</div>
        <div className="bar good" style={{ width: "100%" }}>
          <div style={{ width: `${dayProgress}%` }} />
        </div>
      </div>

      <PanelSection icon="🗓️" title={`${monthName} ${year}`}>
        <div className="calendar-grid">
          {["D", "L", "M", "X", "J", "V", "S"].map((wd, i) => (
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

      <PanelSection icon="⭐" title="Eventos de la estación">
        <div className="empty">
          {season === "summer" &&
            "Verano: los días son largos y los animales pastan más. Cosecha temprana para evitar el calor."}
          {season === "spring" && "Primavera: época ideal de siembra y cría."}
          {season === "autumn" && "Otoño: tiempo de recolección y preparación del granero."}
          {season === "winter" && "Invierno: las noches son largas; la granja descansa."}
        </div>
      </PanelSection>

      <div className="hint">
        El reloj del juego está sincronizado con la hora del sistema. El día y la estación cambian
        de forma automática a medianoche y con el paso de los meses.
      </div>
    </PanelShell>
  );
}
