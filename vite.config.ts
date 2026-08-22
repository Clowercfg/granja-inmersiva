import { defineConfig, Plugin } from "vite";
import react from "@vitejs/plugin-react";

function telegramSdkPlugin(): Plugin {
  return {
    name: "telegram-sdk",
    transformIndexHtml(html) {
      const tag = `<script src="https://telegram.org/js/telegram-web-app.js"></script>`;
      return html.replace("</head>", `    ${tag}\n  </head>`);
    },
  };
}

export default defineConfig({
  plugins: [react(), telegramSdkPlugin()],
  base: "./",
  build: {
    target: "es2022",
    chunkSizeWarningLimit: 1600,
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (
            id.includes("/src/store/") ||
            id.includes("/src/config/") ||
            id.includes("/src/utils/")
          ) {
            return "app-core";
          }
          return undefined;
        },
      },
    },
  },
  server: {
    host: true,
    port: 5174,
    proxy: {
      "/api": {
        target: "http://127.0.0.1:3001",
        changeOrigin: true,
      },
    },
  },
});
