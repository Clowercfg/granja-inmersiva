import { useEffect } from "react";
import { useInteriorStore } from "../store/interiorStore";
import { getInteriorDef } from "../config/interiors";
import { useT } from "../store/languageStore";

const FADE_MS = 450;

export function TransitionOverlay() {
  const t = useT();
  const phase = useInteriorStore((s) => s.phase);
  const type = useInteriorStore((s) => s.type);
  const def = getInteriorDef(type);

  useEffect(() => {
    if (phase === "fadeIn") {
      const t = setTimeout(() => {
        if (useInteriorStore.getState().phase === "fadeIn") useInteriorStore.getState().enterInside();
      }, FADE_MS);
      return () => clearTimeout(t);
    }
    if (phase === "fadeOut") {
      const t = setTimeout(() => {
        if (useInteriorStore.getState().phase === "fadeOut") useInteriorStore.getState().finishExit();
      }, FADE_MS);
      return () => clearTimeout(t);
    }
  }, [phase]);

  const visible = phase === "fadeIn" || phase === "fadeOut";
  const buildingName = def ? t(`building.${type}`) : t("building.generic");
  const label = phase === "fadeIn" ? t("transition.entering", { name: buildingName }) : t("transition.leaving");

  return (
    <div className={`transitionoverlay ${visible ? "visible" : ""}`}>
      <div className="transitionoverlay-vignette" />
      {visible && <div className="transitionoverlay-label">{label}</div>}
    </div>
  );
}
