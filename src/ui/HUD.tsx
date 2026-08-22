import { useEffect, useState } from "react";
import { useWorldStore } from "../store/worldStore";
import { useEconomyStore } from "../store/economyStore";
import { useSelectionStore } from "../store/selectionStore";
import { useInteriorStore } from "../store/interiorStore";
import { useUiStore } from "../store/uiStore";
import { useT } from "../store/languageStore";
import { animalRegistry } from "../store/farmStore";
import { PRODUCTION_PRICE } from "../config/economy";
import { getBuildingTypeByUid, getInteriorDef, hasInterior } from "../config/interiors";

export function HUD() {
  const t = useT();
  const booted = useWorldStore((s) => s.booted);
  const interiorPhase = useInteriorStore((s) => s.phase);
  const interiorType = useInteriorStore((s) => s.type);
  const gold = useEconomyStore((s) => s.gold);
  const [showHelp, setShowHelp] = useState(false);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.code === "Escape") {
        const ui = useUiStore.getState();
        if (ui.storeOpen) {
          ui.closeStore();
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

  if (!booted) {
    return (
      <div className="loading" />
    );
  }

  return (
    <div className="hud">
      <div className="rightbar">
        <div className="pill gold">USD {Math.round(gold).toLocaleString()}</div>
      </div>

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
