/**
 * BABYLON CANVAS — PRUEBA MÍNIMA
 *
 * Auto-contenido. NO importa ningún módulo Babylon propio.
 * Solo importa directamente de @babylonjs/core.
 * Objetivo: demostrar que Babylon renderiza una escena básica.
 */

import { useEffect, useRef, useState } from "react";
import {
  Engine,
  Scene,
  ArcRotateCamera,
  HemisphericLight,
  MeshBuilder,
  Vector3,
  Color4,
} from "@babylonjs/core";
import { useWorldStore } from "../../store/worldStore";

console.log("[BABYLON] Module loaded — timestamp:", Date.now());

export function BabylonCanvas() {
  console.count("[BABYLON] Component render");

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState("component rendered — waiting for useEffect");

  useEffect(() => {
    console.log("[BABYLON] 1 - useEffect fired");
    setStatus("1 - useEffect fired");

    const canvas = canvasRef.current;
    if (!canvas) {
      console.error("[BABYLON] ERROR: canvas ref is null");
      setError("canvas ref is null");
      return;
    }

    console.log("[BABYLON] 2 - Canvas found");
    console.log("[BABYLON]    canvas:", canvas);
    console.log("[BABYLON]    clientWidth:", canvas.clientWidth);
    console.log("[BABYLON]    clientHeight:", canvas.clientHeight);
    console.log("[BABYLON]    width:", canvas.width);
    console.log("[BABYLON]    height:", canvas.height);

    if (canvas.clientWidth === 0 || canvas.clientHeight === 0) {
      const msg = `Canvas has zero dimensions: ${canvas.clientWidth}x${canvas.clientHeight}`;
      console.error("[BABYLON] ERROR:", msg);
      setError(msg);
      return;
    }
    setStatus("2 - Canvas OK");

    let engine: Engine | null = null;
    let scene: Scene | null = null;

    try {
      console.log("[BABYLON] 3 - Creating Engine...");
      setStatus("3 - Creating Engine...");
      console.count("[BABYLON] Engine creation");

      engine = new Engine(canvas, true);
      console.log("[BABYLON] 4 - Engine created:", engine);
      setStatus("4 - Engine created");

      console.log("[BABYLON] 5 - Creating Scene...");
      setStatus("5 - Creating Scene...");
      scene = new Scene(engine);
      scene.clearColor = new Color4(0.4, 0.7, 0.9, 1);
      console.log("[BABYLON] 6 - Scene created:", scene);
      setStatus("6 - Scene created");

      console.log("[BABYLON] 7 - Creating Camera...");
      setStatus("7 - Creating Camera...");
      const camera = new ArcRotateCamera(
        "camera",
        -Math.PI / 4,
        Math.PI / 3,
        12,
        Vector3.Zero(),
        scene
      );
      camera.attachControl(canvas, true);
      console.log("[BABYLON] 8 - Camera created");
      setStatus("8 - Camera created");

      console.log("[BABYLON] 9 - Creating Light...");
      setStatus("9 - Creating Light...");
      new HemisphericLight("light", new Vector3(0, 1, 0), scene);
      console.log("[BABYLON] 10 - Light created");
      setStatus("10 - Light created");

      MeshBuilder.CreateBox("testBox", { size: 2 }, scene);
      console.log("[BABYLON] 11 - Box created");
      setStatus("11 - Box created");

      MeshBuilder.CreateGround("ground", { width: 20, height: 20 }, scene);
      console.log("[BABYLON] 12 - Ground created");
      setStatus("12 - Ground created");

      let firstFrame = true;
      engine.runRenderLoop(() => {
        if (firstFrame) {
          console.log("[BABYLON] 13 - FIRST FRAME RENDERED");
          setStatus("13 - FIRST FRAME RENDERED");
          firstFrame = false;
          useWorldStore.getState().setBooted(true);
        }
        scene!.render();
      });
      console.log("[BABYLON] 14 - Render loop started");
      setStatus("14 - Render loop started — scene should be visible");

      const onResize = () => engine!.resize();
      window.addEventListener("resize", onResize);

      return () => {
        console.log("[BABYLON] Disposing...");
        useWorldStore.getState().setBooted(false);
        window.removeEventListener("resize", onResize);
        engine!.stopRenderLoop();
        scene!.dispose();
        engine!.dispose();
      };
    } catch (err) {
      console.error("[BABYLON ERROR]", err);
      setError(String(err));
    }
  }, []);

  if (error) {
    return (
      <div style={{
        position: "fixed", inset: 0, background: "#1a0a0a", color: "#ff6b6b",
        display: "flex", flexDirection: "column", alignItems: "center",
        justifyContent: "center", fontFamily: "monospace", fontSize: 14, padding: 40,
      }}>
        <div style={{ fontSize: 20, marginBottom: 16 }}>Error al inicializar Babylon.js</div>
        <pre style={{ maxWidth: 600, whiteSpace: "pre-wrap", textAlign: "center" }}>{error}</pre>
      </div>
    );
  }

  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 0 }}>
      <div style={{
        position: "absolute", bottom: 8, left: 8, padding: "4px 10px",
        background: "rgba(0,0,0,0.75)", color: "#0f0",
        fontFamily: "monospace", fontSize: 11, zIndex: 9999, borderRadius: 4,
      }}>
        {status}
      </div>
      <canvas
        ref={canvasRef}
        style={{ width: "100%", height: "100%", display: "block", outline: "none" }}
      />
    </div>
  );
}
