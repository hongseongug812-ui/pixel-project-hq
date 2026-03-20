import { BF } from "../data/constants";
import type { ToastItem } from "../types";

interface ToastProps {
  toasts: ToastItem[];
  onUndo: (undoId: number) => void;
}

export default function Toast({ toasts, onUndo }: ToastProps) {
  if (!toasts.length) return null;
  return (
    <div style={{ position: "fixed", bottom: 20, right: 20, zIndex: 9999, display: "flex", flexDirection: "column", gap: 6 }}>
      <style>{`@keyframes slideIn { from { opacity: 0; transform: translateX(20px); } to { opacity: 1; transform: translateX(0); } }`}</style>
      {toasts.map(t => {
        const color = t.type === "error" ? "#ef4444" : t.type === "warn" ? "#facc15" : "#4ade80";
        return (
          <div key={t.id} style={{
            background: t.type === "error" ? "#1a0808" : t.type === "warn" ? "#1a1208" : "#081208",
            border: `1px solid ${color}55`,
            padding: "8px 14px", fontFamily: BF, fontSize: 12, color,
            minWidth: 200, maxWidth: 340, display: "flex", alignItems: "center", gap: 8,
            animation: "slideIn .2s ease", boxShadow: "0 4px 20px rgba(0,0,0,.5)",
          }}>
            <span style={{ flex: 1 }}>{t.emoji} {t.msg}</span>
            {t.undoId && onUndo && (
              <button onClick={() => onUndo(t.undoId!)} style={{
                all: "unset", cursor: "pointer", fontFamily: BF, fontSize: 11,
                color: "#000", background: "#facc15", padding: "2px 8px", flexShrink: 0,
              }}>↩ 취소</button>
            )}
          </div>
        );
      })}
    </div>
  );
}
