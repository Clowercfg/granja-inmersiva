import { useEffect, useState } from "react";
import { useWorldStore } from "../store/worldStore";
import { useEconomyStore } from "../store/economyStore";
import { useSelectionStore } from "../store/selectionStore";
import { useInteriorStore } from "../store/interiorStore";
import { animalRegistry } from "../store/farmStore";
import { WEATHER } from "../config/world";
import type { AnimalState } from "../types";
import { getBuildingTypeByUid, getInteriorDef, hasInterior } from "../config/interiors";
import { DAY_PHASE_LABEL, SEASON_LABEL } from "../systems/time/TimeManager";
import type { DayPhase, Season } from "../systems/time/TimeManager";

const STATE_LABEL: Record<AnimalState, string> = {
  rest: "Descansando",
  wander: "Paseando",
  eating: "Paciendo",
  sleep: "Durmiendo",
};

const PHASE_ICON: Record<DayPhase, string> = {
  dawn: "🌅",
  morning: "🌤️",
  midday: "☀️",
  afternoon: "🌇",
  dusk: "🌆",
  night: "🌙",
};

const SEASON_ICON: Record<Season, string> = {
  spring: "🌸",
  summer: "☀️",
  autumn: "🍂",
  winter: "❄️",
};

const PRICE: Record<"cow" | "chicken", number> = { cow: 2.4, chicken: 1.2 };

function pad(n: number): string {
  return String(n).padStart(2, "0");
}

export function HUD() {
  const booted = useWorldStore((s) => s.booted);
  const hour = useWorldStore((s) => s.hour);
  const minute = useWorldStore((s) => s.minute);
  const second = useWorldStore((s) => s.second);
  const dayOfWeek = useWorldStore((s) => s.dayOfWeek);
  const dayOfMonth = useWorldStore((s) => s.dayOfMonth);
  const monthName = useWorldStore((s) => s.monthName);
  const year = useWorldStore((s) => s.year);
  const season = useWorldStore((s) => s.season);
  const dayPhase = useWorldStore((s) => s.dayPhase);
  const weather = useWorldStore((s) => s.weather);
  const mode = useWorldStore((s) => s.rendererMode);
  const gold = useEconomyStore((s) => s.gold);
  const interiorPhase = useInteriorStore((s) => s.phase);
  const interiorType = useInteriorStore((s) => s.type);
  const [showHelp, setShowHelp] = useState(false);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.code === "Escape") {
        const it = useInteriorStore.getState();
        if (it.phase !== "idle") {
          if (it.phase === "inside") it.requestExit();
          else it.reset();
          return;
        }
        if (useSelectionStore.getState().selected) {
          useSelectionStore.getState().select(null);
        } else {
          setShowHelp((h) => !h);
        }
      }
      if (e.code === "KeyH") setShowHelp((h) => !h);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  if (!booted) {
    return (
      <div className="loading">
        <h1>IMMERSIVE FARM 3D</h1>
        <div className="barwrap">
          <div />
        </div>
        <span>{mode === "webgpu" ? "Iniciando motor WebGPU…" : "Iniciando motor WebGL2…"}</span>
      </div>
    );
  }

  return (
    <div className="hud">
      <div className="topbar">
        <div className="brand">
          <h1>IMMERSIVE FARM 3D</h1>
          <span>SIMULADOR DE GRANJA</span>
        </div>
        <div className="timeblock">
          <span className="clock">
            <b>
              {pad(hour)}:{pad(minute)}
            </b>
            <span className="clock-sec">:{pad(second)}</span>
          </span>
          <span>
            <b>
              {dayOfWeek}, {dayOfMonth} de {monthName} de {year}
            </b>
          </span>
          <span>
            {PHASE_ICON[dayPhase]} {DAY_PHASE_LABEL[dayPhase]} · {SEASON_ICON[season]} {SEASON_LABEL[season]}
          </span>
          <span>{WEATHER[weather].label}</span>
          <span>{mode === "webgpu" ? "WebGPU" : "WebGL2"}</span>
        </div>
        <div className="rightbar">
          <div className="pill gold">USD {Math.round(gold).toLocaleString()}</div>
          <button className="btn" onClick={() => setShowHelp((h) => !h)}>
            ?
          </button>
        </div>
      </div>

      <SelectionPanel />

      {interiorPhase === "inside" && interiorType && (
        <button className="exitbutton" onClick={() => useInteriorStore.getState().requestExit()}>
          🚪 Salir del {getInteriorDef(interiorType)?.name ?? "edificio"}
        </button>
      )}

      {showHelp && (
        <div className="helppanel">
          <h3>Controles</h3>
          <div className="krow">
            <span className="k">W A S D</span>
            <span>Mover cámara</span>
          </div>
          <div className="krow">
            <span className="k">Shift</span>
            <span>Acelerar</span>
          </div>
          <div className="krow">
            <span className="k">Botón der.</span>
            <span>Rotar vista</span>
          </div>
          <div className="krow">
            <span className="k">Rueda</span>
            <span>Zoom</span>
          </div>
          <div className="krow">
            <span className="k">Clic</span>
            <span>Seleccionar</span>
          </div>
          <div className="krow">
            <span className="k">Esc</span>
            <span>Cerrar panel</span>
          </div>
        </div>
      )}
    </div>
  );
}

function SelectionPanel() {
  const selected = useSelectionStore((s) => s.selected);
  const [, setTick] = useState(0);

  useEffect(() => {
    const iv = setInterval(() => setTick((t) => t + 1), 250);
    return () => clearInterval(iv);
  }, []);

  if (!selected) return null;

  const agent =
    selected.kind === "animal" ? animalRegistry.get(Number(selected.uid.split("-")[1])) : undefined;

  return (
    <div className="leftpanel">
      <h2>{selected.title}</h2>
      <div className="sub">{selected.subtitle}</div>

      {agent && (
        <>
          <div className="statrow">
            <span>Estado</span>
            <b>{STATE_LABEL[agent.state]}</b>
          </div>
          <div className="statrow">
            <span>Ánimo</span>
            <b>{Math.round(agent.mood * 100)}%</b>
          </div>
          <div className="bar warn" style={{ width: "100%" }}>
            <div style={{ width: `${Math.round(agent.mood * 100)}%` }} />
          </div>
          <div className="statrow">
            <span>Salud</span>
            <b>{Math.round(agent.health)}%</b>
          </div>
          <div className="bar good" style={{ width: "100%" }}>
            <div style={{ width: `${Math.round(agent.health)}%` }} />
          </div>
          <div className="statrow">
            <span>Producción pendiente</span>
            <b>
              {agent.pendingProduction.toFixed(1)}{" "}
              {agent.kind === "cow" ? "L leche" : "huevos"} · $
              {(agent.pendingProduction * PRICE[agent.kind]).toFixed(2)}
            </b>
          </div>
          <div className="hint">
            Los animales producen a lo largo del día. Su producción se vende automáticamente cada
            pocos segundos.
          </div>
        </>
      )}

      {selected.kind === "building" && (
        <>
          {(() => {
            const btype = getBuildingTypeByUid(selected.uid);
            const def = getInteriorDef(btype);
            if (btype && def && hasInterior(btype)) {
              return (
                <div className="enterblock">
                  <button
                    className="btn primary enterbtn"
                    onClick={() => {
                      useSelectionStore.getState().select(null);
                      useInteriorStore.getState().requestEnter(selected.uid, btype);
                    }}
                  >
                    🚪 Entrar al {def.name}
                  </button>
                  <div className="hint">
                    Entra para inspeccionar el interior. Usa el botón «Salir» para volver a la granja.
                  </div>
                </div>
              );
            }
            return (
              <div className="hint">
                Edificio existente de la granja. Gestiona la infraestructura desde el panel lateral.
              </div>
            );
          })()}
        </>
      )}
    </div>
  );
}
