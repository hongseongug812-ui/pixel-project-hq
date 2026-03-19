import { BF } from "../data/constants";

export default function Toast({ toasts }) {
  if (!toasts.length) return null;
  return (
    <div style={{ position: "fixed", bottom: 20, right: 20, zIndex: 9999, display: "flex", flexDirection: "column", gap: 6, pointerEvents: "none" }}>
      <style>{`
        @keyframes slideIn { from { opacity: 0; transform: translateX(20px); } to { opacity: 1; transform: translateX(0); } }
        @keyframes fadeOut { from { opacity: 1; } to { opacity: 0; } }
      `}</style>
      {toasts.map(t => (
        <div key={t.id} style={{
          background: t.type === "error" ? "#1a0808" : t.type === "warn" ? "#1a1208" : "#081208",
          border: `1px solid ${t.type === "error" ? "#ef444455" : t.type === "warn" ? "#facc1555" : "#4ade8055"}`,
          padding: "8px 14px", fontFamily: BF, fontSize: 12,
          color: t.type === "error" ? "#ef4444" : t.type === "warn" ? "#facc15" : "#4ade80",
          minWidth: 200, maxWidth: 340,
          animation: "slideIn .2s ease",
          boxShadow: `0 4px 20px rgba(0,0,0,.5)`,
        }}>
          {t.emoji} {t.msg}
        </div>
      ))}
    </div>
  );
}
