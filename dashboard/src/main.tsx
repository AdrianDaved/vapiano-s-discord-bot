// Polyfill crypto.randomUUID for non-secure (HTTP) contexts — React 18.3 needs it for useId
if (typeof crypto !== "undefined" && typeof crypto.randomUUID !== "function") {
  (crypto as any).randomUUID = function (): string {
    return "10000000-1000-4000-8000-100000000000".replace(/[018]/g, (c: any) =>
      (c ^ ((Math.random() * 16) >> (c / 4))).toString(16)
    );
  };
}

import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import App from "./App";
import "./index.css";

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <BrowserRouter>
      <App />
    </BrowserRouter>
  </React.StrictMode>
);
