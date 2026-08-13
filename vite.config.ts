import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  base: "./",
  build: {
    target: "es2022",
    chunkSizeWarningLimit: 1600,
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes("node_modules/@react-three/rapier") || id.includes("node_modules/@dimforge")) {
            return "physics";
          }
          if (
            id.includes("node_modules/three") ||
            id.includes("node_modules/@react-three/fiber") ||
            id.includes("node_modules/@react-three/drei") ||
            id.includes("node_modules/@use-gpu")
          ) {
            return "three";
          }
          if (
            id.includes("node_modules/postprocessing") ||
            id.includes("node_modules/@react-three/postprocessing")
          ) {
            return "fx";
          }
          if (id.includes("node_modules/react") || id.includes("node_modules/scheduler")) {
            return "react";
          }
          return undefined;
        },
      },
    },
  },
  server: {
    host: true,
    port: 5174,
  },
});
