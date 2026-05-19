import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import App from "./App";
import "./index.css";
import "highlight.js/styles/atom-one-dark.css";

// Apply saved theme before first paint to avoid flash
const savedTheme = (() => {
  try { return localStorage.getItem("theme") ?? "dark"; } catch { return "dark"; }
})();
document.documentElement.setAttribute("data-theme", savedTheme);

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <BrowserRouter>
      <App />
    </BrowserRouter>
  </React.StrictMode>
);
