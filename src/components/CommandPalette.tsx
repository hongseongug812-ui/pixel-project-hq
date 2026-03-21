import { useState, useEffect, useRef, useMemo } from "react";
import { PF, BF, STATUS_MAP } from "../data/constants";
import type { Project } from "../types";

interface Props {
  projects: Project[];
  onSelect: (id: number | string) => void;
  onClose: () => void;
}

export default function CommandPalette({ projects, onSelect, onClose }: Props) {
  const [q, setQ] = useState("");
  const [cursor, setCursor] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  useEffect(() => { inputRef.current?.focus(); }, []);

  const results = useMemo(() => {
    const query = q.trim().toLowerCase();
    if (!query) return projects.slice(0, 8);
    return projects.filter(p =>
      p.name.toLowerCase().includes(query) ||
      (p.description || "").toLowerCase().includes(query) ||
      (p.stack || []).some(s => s.toLowerCase().includes(query))
    ).slice(0, 8);
  }, [q, projects]);

  useEffect(() => { setCursor(0); }, [q]);

  function confirm(p: Project) {
    onSelect(p.id);
    onClose();
  }

  function onKey(e: React.KeyboardEvent) {
    if (e.key === "ArrowDown") { e.preventDefault(); setCursor(c => Math.min(c + 1, results.length - 1)); }
    if (e.key === "ArrowUp")   { e.preventDefault(); setCursor(c => Math.max(c - 1, 0)); }
    if (e.key === "Enter" && results[cursor]) confirm(results[cursor]);
    if (e.key === "Escape") onClose();
  }

  useEffect(() => {
    const el = listRef.current?.children[cursor] as HTMLElement | undefined;
    el?.scrollIntoView({ block: "nearest" });
  }, [cursor]);

  const highlight = (text: string) => {
    if (!q.trim()) return <>{text}</>;
    const idx = text.toLowerCase().indexOf(q.trim().toLowerCase());
    if (idx === -1) return <>{text}</>;
    return <>{text.slice(0, idx)}<mark style={{ background: "#facc1544", color: "#facc15", padding: 0 }}>{text.slice(idx, idx + q.trim().length)}</mark>{text.slice(idx + q.trim().length)}</>;
  };

  return (
    <div
      onClick={onClose}
      style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,.6)", zIndex: 1000, display: "flex", alignItems: "flex-start", justifyContent: "center", paddingTop: "15vh" }}
    >
      <div onClick={e => e.stopPropagation()} style={{ width: 480, maxWidth: "92vw", background: "#0c0c14", border: "1px solid #facc1544", borderRadius: 4, overflow: "hidden", boxShadow: "0 20px 60px #000a" }}>

        {/* Input */}
        <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "10px 14px", borderBottom: "1px solid #1a1a28" }}>
          <span style={{ fontFamily: PF, fontSize: 6, color: "#facc15" }}>⌘</span>
          <input
            ref={inputRef}
            value={q}
            onChange={e => setQ(e.target.value)}
            onKeyDown={onKey}
            placeholder="프로젝트 검색..."
            style={{ flex: 1, fontFamily: BF, fontSize: 14, color: "#ddd", background: "transparent", border: "none", outline: "none" }}
          />
          <span style={{ fontFamily: PF, fontSize: 4, color: "#333" }}>ESC</span>
        </div>

        {/* Results */}
        <div ref={listRef} style={{ maxHeight: 320, overflowY: "auto" }}>
          {results.length === 0 ? (
            <div style={{ padding: "16px 14px", fontFamily: BF, fontSize: 13, color: "#333", textAlign: "center" }}>결과 없음</div>
          ) : results.map((p, i) => {
            const st = STATUS_MAP[p.status];
            const isCursor = i === cursor;
            return (
              <button
                key={p.id}
                onClick={() => confirm(p)}
                onMouseEnter={() => setCursor(i)}
                style={{
                  all: "unset", cursor: "pointer", display: "flex", alignItems: "center", gap: 10,
                  width: "100%", boxSizing: "border-box", padding: "8px 14px",
                  background: isCursor ? "#facc1511" : "transparent",
                  borderLeft: `2px solid ${isCursor ? "#facc15" : "transparent"}`,
                }}
              >
                <div style={{ width: 6, height: 6, borderRadius: "50%", background: st?.color ?? "#555", flexShrink: 0 }} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontFamily: BF, fontSize: 13, color: isCursor ? "#facc15" : "#ccc", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                    {highlight(p.name)}
                  </div>
                  {p.stack && p.stack.length > 0 && (
                    <div style={{ fontFamily: PF, fontSize: 3, color: "#444", marginTop: 2 }}>{p.stack.slice(0, 4).join(" · ")}</div>
                  )}
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 6, flexShrink: 0 }}>
                  <span style={{ fontFamily: PF, fontSize: 4, color: "#555" }}>{p.progress}%</span>
                  <span style={{ fontFamily: PF, fontSize: 3, color: st?.color ?? "#555", background: `${st?.color ?? "#555"}18`, border: `1px solid ${st?.color ?? "#555"}33`, padding: "1px 4px" }}>{p.status}</span>
                </div>
              </button>
            );
          })}
        </div>

        <div style={{ padding: "5px 14px", borderTop: "1px solid #1a1a28", display: "flex", gap: 12 }}>
          <span style={{ fontFamily: PF, fontSize: 3, color: "#333" }}>↑↓ 이동</span>
          <span style={{ fontFamily: PF, fontSize: 3, color: "#333" }}>Enter 선택</span>
          <span style={{ fontFamily: PF, fontSize: 3, color: "#333" }}>Esc 닫기</span>
        </div>
      </div>
    </div>
  );
}
