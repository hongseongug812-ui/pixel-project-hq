import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import { AuthProvider } from "./contexts/AuthContext";
import { LogsProvider } from "./contexts/LogsContext";
import "./styles/global.css";

ReactDOM.createRoot(document.getElementById("root") as HTMLElement).render(
  <React.StrictMode>
    <AuthProvider>
      <LogsProvider>
        <App />
      </LogsProvider>
    </AuthProvider>
  </React.StrictMode>
);
