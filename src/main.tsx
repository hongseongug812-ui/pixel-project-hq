import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import { AuthProvider } from "./contexts/AuthContext";
import { LogsProvider } from "./contexts/LogsContext";
import ErrorBoundary from "./components/ErrorBoundary";
import "./styles/global.css";

ReactDOM.createRoot(document.getElementById("root") as HTMLElement).render(
  <React.StrictMode>
    <ErrorBoundary>
      <AuthProvider>
        <LogsProvider>
          <App />
        </LogsProvider>
      </AuthProvider>
    </ErrorBoundary>
  </React.StrictMode>
);
