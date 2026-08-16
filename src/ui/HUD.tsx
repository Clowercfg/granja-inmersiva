import { useEffect, useRef, useState } from "react";
import { useWorldStore } from "../store/worldStore";
import { useEconomyStore } from "../store/economyStore";
import { useSelectionStore } from "../store/selectionStore";
import { useInteriorStore } from "../store/interiorStore";
import { useUiStore } from "../store/uiStore";
import { useT } from "../store/languageStore";
import { animalRegistry } from "../store/farmStore";
import { PRODUCTION_PRICE } from "../config/economy";
import { getBuildingTypeByUid, getInteriorDef, hasInterior } from "../config/interiors";
import type { DayPhase, Season } from "../systems/time/TimeManager";
import { readSession } from "./auth/authStore";

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

function pad(n: number): string {
  return String(n).padStart(2, "0");
}

export function HUD({ onLogout }: { onLogout: () => void }) {
  const t = useT();
  const booted = useWorldStore((s) => s.booted);
  const hour = useWorldStore((s) => s.hour);
  const minute = useWorldStore((s) => s.minute);
  const second = useWorldStore((s) => s.second);
  const dayOfMonth = useWorldStore((s) => s.dayOfMonth);
  const year = useWorldStore((s) => s.year);
  const season = useWorldStore((s) => s.season);
  const dayPhase = useWorldStore((s) => s.dayPhase);
  const weather = useWorldStore((s) => s.weather);
  const mode = useWorldStore((s) => s.rendererMode);
  const gold = useEconomyStore((s) => s.gold);
  const interiorPhase = useInteriorStore((s) => s.phase);
  const interiorType = useInteriorStore((s) => s.type);
  const [session] = useState(() => readSession());
  const [showHelp, setShowHelp] = useState(false);
  const [showProfile, setShowProfile] = useState(false);
  const profileOpen = useRef(false);

  useEffect(() => {
    profileOpen.current = showProfile;
  }, [showProfile]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.code === "Escape") {
        const ui = useUiStore.getState();
        if (ui.storeOpen) {
          ui.closeStore();
          return;
        }
        if (profileOpen.current) {
          setShowProfile(false);
          return;
        }
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

  const initials = (session?.name ?? "A")
    .split(/\s+/)
    .map((w) => w[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();

  if (!booted) {
    return (
      <div className="loading">
        <h1>{t("app.brand")}</h1>
        <div className="barwrap">
          <div />
        </div>
        <span>{mode === "webgpu" ? t("app.loading.webgpu") : t("app.loading.webgl")}</span>
      </div>
    );
  }

  const nowD = new Date();
  const dow = t(`time.weekday.${nowD.getDay()}`);
  const mon = t(`time.month.${nowD.getMonth()}`);

  return (
    <div className="hud">
      <div className="topbar">
        <div className="brand">
          <h1>{t("app.brand")}</h1>
          <span>{t("app.tagline")}</span>
        </div>
        <div className="timeblock">
          <span className="clock">
            <b>
              {pad(hour)}:{pad(minute)}
            </b>
            <span className="clock-sec">:{pad(second)}</span>
          </span>
          <span>
            <b>{t("time.date_hud", { dow, day: dayOfMonth, month: mon, year })}</b>
          </span>
          <span>
            {PHASE_ICON[dayPhase]} {t(`time.dayphase.${dayPhase}`)} · {SEASON_ICON[season]}{" "}
            {t(`time.season.${season}`)}
          </span>
          <span>{t(`weather.${weather}`)}</span>
          <span>{mode === "webgpu" ? "WebGPU" : "WebGL2"}</span>
        </div>
        <div className="rightbar">
          <div className="pill gold">USD {Math.round(gold).toLocaleString()}</div>
          <button
            className={`btn profilebar${showProfile ? " active" : ""}`}
            onClick={() => {
              setShowProfile((p) => !p);
              setShowHelp(false);
            }}
            title="Abrir perfil"
          >
            👤 <span className="profilebar-name">{session?.name ?? "Perfil"}</span>
          </button>
          <button
            className="btn"
            onClick={() => {
              setShowHelp((h) => !h);
              setShowProfile(false);
            }}
          >
            ?
          </button>
        </div>
      </div>

      {showProfile && (
        <div className="profilepanel">
          <div className="profile-head">
            <div className="profile-avatar">{initials}</div>
            <div>
              <b className="profile-name">{session?.name ?? "Agricultor"}</b>
              <span className="profile-mail">{session?.email ?? "sin sesión"}</span>
            </div>
          </div>
          <button
            className="profile-opt"
            onClick={() => {
              setShowProfile(false);
              useUiStore.getState().openSection("inventory");
            }}
          >
            📦 Inventario
          </button>
          <button
            className="profile-opt"
            onClick={() => {
              setShowProfile(false);
              useUiStore.getState().openSection("calendar");
            }}
          >
            📅 Calendario
          </button>
          <button
            className="profile-opt"
            onClick={() => {
              setShowProfile(false);
              useUiStore.getState().openSection("upgrades");
            }}
          >
            📈 Mejoras
          </button>
          <button
            className="profile-opt"
            onClick={() => {
              setShowProfile(false);
              setShowHelp(true);
            }}
          >
            ❓ Ayuda y controles
          </button>
          <button className="profile-opt danger" onClick={onLogout}>
            🚪 Cerrar sesión
          </button>
        </div>
      )}

      <SelectionPanel />

      {interiorPhase === "inside" && interiorType && (
        <button className="exitbutton" onClick={() => useInteriorStore.getState().requestExit()}>
          {t("hud.exit_building", { name: t(`building.${interiorType}`) })}
        </button>
      )}

      {showHelp && (
        <div className="helppanel">
          <h3>{t("hud.help_title")}</h3>
          <div className="krow">
            <span className="k">W A S D</span>
            <span>{t("hud.help_move")}</span>
          </div>
          <div className="krow">
            <span className="k">Shift</span>
            <span>{t("hud.help_boost")}</span>
          </div>
          <div className="krow">
            <span className="k">{t("hud.help_rmb")}</span>
            <span>{t("hud.help_rotate")}</span>
          </div>
          <div className="krow">
            <span className="k">Scroll</span>
            <span>{t("hud.help_zoom")}</span>
          </div>
          <div className="krow">
            <span className="k">Click</span>
            <span>{t("hud.help_select")}</span>
          </div>
          <div className="krow">
            <span className="k">Esc</span>
            <span>{t("hud.help_close")}</span>
          </div>
        </div>
      )}
    </div>
  );
}

function SelectionPanel() {
  const t = useT();
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
            <span>{t("hud.state")}</span>
            <b>{t(`animalState.${agent.state}`)}</b>
          </div>
          <div className="statrow">
            <span>{t("hud.mood")}</span>
            <b>{Math.round(agent.mood * 100)}%</b>
          </div>
          <div className="bar warn" style={{ width: "100%" }}>
            <div style={{ width: `${Math.round(agent.mood * 100)}%` }} />
          </div>
          <div className="statrow">
            <span>{t("hud.health")}</span>
            <b>{Math.round(agent.health)}%</b>
          </div>
          <div className="bar good" style={{ width: "100%" }}>
            <div style={{ width: `${Math.round(agent.health)}%` }} />
          </div>
          <div className="statrow">
            <span>{t("hud.pending")}</span>
            <b>
              {agent.pendingProduction.toFixed(1)} {t(`hud.prod_unit.${agent.kind}`)} · $
              {(agent.pendingProduction * PRODUCTION_PRICE[agent.kind]).toFixed(2)}
            </b>
          </div>
          <div className="hint">{t("hud.prod_hint")}</div>
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
                    {t("hud.enter_building", { name: t(`building.${btype}`) })}
                  </button>
                  <div className="hint">{t("hud.enter_hint")}</div>
                </div>
              );
            }
            return <div className="hint">{t("hud.no_interior")}</div>;
          })()}
        </>
      )}
    </div>
  );
}
