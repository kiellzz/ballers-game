import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import { activeThemeClass } from "./styles/activeTheme";
import "./index.css";
import "./styles/active-theme.css";

document.body.classList.remove("theme-world-cup");

if (activeThemeClass) {
  document.body.classList.add(activeThemeClass);
}

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
