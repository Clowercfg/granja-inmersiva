import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { mark } from "./core/bootMetrics";
import App from "./App";
import "./index.css";

mark("main_module_eval");

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <App />
  </StrictMode>
);

mark("react_mount_called");
