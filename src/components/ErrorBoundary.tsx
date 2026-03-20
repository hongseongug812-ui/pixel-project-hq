import { Component, type ReactNode, type ErrorInfo } from "react";

interface Props { children: ReactNode; }
interface State { error: Error | null; }

export default class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error("[Pixel HQ] Uncaught error:", error, info);
  }

  render() {
    if (this.state.error) {
      return (
        <div style={{
          minHeight: "100vh", background: "#0d0d12",
          display: "flex", flexDirection: "column",
          alignItems: "center", justifyContent: "center", gap: 16,
        }}>
          <div style={{ fontFamily: "'Press Start 2P',monospace", fontSize: 12, color: "#ef4444" }}>
            ⚠ SYSTEM ERROR
          </div>
          <div style={{ fontFamily: "'DotGothic16',monospace", fontSize: 13, color: "#555", maxWidth: 400, textAlign: "center" }}>
            {this.state.error.message}
          </div>
          <button
            onClick={() => { this.setState({ error: null }); window.location.reload(); }}
            style={{
              fontFamily: "'Press Start 2P',monospace", fontSize: 6,
              color: "#000", background: "#facc15",
              border: "none", cursor: "pointer", padding: "8px 20px", marginTop: 8,
            }}
          >
            RELOAD
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}
