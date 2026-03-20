import { useState, useRef, useEffect } from "react";
import type { ChatMessage } from "../hooks/useAIChat";

const PF = "'Press Start 2P', monospace";
const BF = "'DotGothic16', sans-serif";

interface AIChatProps {
  messages: ChatMessage[];
  loading: boolean;
  onSend: (text: string) => void;
  onClear: () => void;
}

export default function AIChat({ messages, loading, onSend, onClear }: AIChatProps) {
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState("");
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  const submit = () => {
    if (!input.trim() || loading) return;
    onSend(input.trim());
    setInput("");
  };

  return (
    <>
      {/* Floating button */}
      <button
        onClick={() => setOpen(o => !o)}
        style={{
          position: "fixed", bottom: 20, right: 20, zIndex: 1000,
          width: 44, height: 44, borderRadius: 0,
          background: open ? "#facc15" : "#111118",
          border: `2px solid ${open ? "#facc15" : "#2a2a38"}`,
          cursor: "pointer", fontFamily: PF, fontSize: 14,
          color: open ? "#000" : "#facc15",
          boxShadow: open ? "0 0 20px #facc1566" : "0 0 10px #0005",
          display: "flex", alignItems: "center", justifyContent: "center",
        }}
        title="AI 매니저"
      >
        {open ? "✕" : "AI"}
      </button>

      {/* Chat panel */}
      {open && (
        <div style={{
          position: "fixed", bottom: 74, right: 20, zIndex: 999,
          width: 340, height: 480,
          background: "#0a0a10", border: "1px solid #2a2a38",
          display: "flex", flexDirection: "column",
          boxShadow: "0 0 40px #0009",
        }}>
          {/* Header */}
          <div style={{
            padding: "8px 12px", borderBottom: "1px solid #1a1a28",
            display: "flex", alignItems: "center", justifyContent: "space-between",
            background: "#0c0c14",
          }}>
            <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <div style={{ width: 6, height: 6, background: "#4ade80", boxShadow: "0 0 6px #4ade80", borderRadius: "50%" }} />
              <span style={{ fontFamily: PF, fontSize: 6, color: "#facc15" }}>AI MANAGER</span>
            </div>
            <button
              onClick={onClear}
              style={{ all: "unset", cursor: "pointer", fontFamily: PF, fontSize: 5, color: "#444", padding: "2px 6px", border: "1px solid #1e1e28" }}
            >CLR</button>
          </div>

          {/* Messages */}
          <div style={{ flex: 1, overflowY: "auto", padding: "10px 12px", display: "flex", flexDirection: "column", gap: 8 }}>
            {messages.length === 0 && (
              <div style={{ color: "#333", fontFamily: BF, fontSize: 12, textAlign: "center", marginTop: 40 }}>
                <div style={{ fontFamily: PF, fontSize: 6, color: "#2a2a38", marginBottom: 12 }}>AI MANAGER</div>
                <div>프로젝트를 자연어로 관리하세요</div>
                <div style={{ marginTop: 16, display: "flex", flexDirection: "column", gap: 6 }}>
                  {[
                    "\"Pixel HQ 진행률 80으로 올려줘\"",
                    "\"Vercel 배포 완료로 표시해줘\"",
                    "\"이번 주 active 프로젝트 요약해줘\"",
                    "\"새 프로젝트 추가해줘\"",
                  ].map(ex => (
                    <button
                      key={ex}
                      onClick={() => { setInput(ex.replace(/"/g, "")); }}
                      style={{
                        all: "unset", cursor: "pointer",
                        fontFamily: BF, fontSize: 11, color: "#555",
                        border: "1px solid #1a1a28", padding: "4px 8px",
                        textAlign: "left",
                      }}
                    >{ex}</button>
                  ))}
                </div>
              </div>
            )}

            {messages.map((m, i) => (
              <div key={i} style={{ display: "flex", flexDirection: "column", gap: 2, alignItems: m.role === "user" ? "flex-end" : "flex-start" }}>
                <span style={{ fontFamily: PF, fontSize: 4, color: "#333" }}>
                  {m.role === "user" ? "YOU" : "AI"}
                </span>
                <div style={{
                  maxWidth: "85%",
                  padding: "7px 10px",
                  background: m.role === "user" ? "#1a1a2e" : "#0e1a0e",
                  border: `1px solid ${m.role === "user" ? "#2a2a48" : "#1a2a1a"}`,
                  fontFamily: BF,
                  fontSize: 12,
                  color: m.role === "user" ? "#a0a0c0" : "#90c090",
                  lineHeight: 1.6,
                  whiteSpace: "pre-wrap",
                }}>
                  {m.content}
                </div>
              </div>
            ))}

            {loading && (
              <div style={{ display: "flex", flexDirection: "column", gap: 2, alignItems: "flex-start" }}>
                <span style={{ fontFamily: PF, fontSize: 4, color: "#333" }}>AI</span>
                <div style={{ padding: "7px 10px", background: "#0e1a0e", border: "1px solid #1a2a1a", display: "flex", gap: 4 }}>
                  {[0, 1, 2].map(i => (
                    <div key={i} style={{ width: 5, height: 5, background: "#4ade80", animation: `blink 1s ${i * 0.2}s steps(2) infinite` }} />
                  ))}
                </div>
              </div>
            )}
            <div ref={bottomRef} />
          </div>

          {/* Input */}
          <div style={{ padding: "8px 12px", borderTop: "1px solid #1a1a28", display: "flex", gap: 6 }}>
            <input
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); submit(); } }}
              placeholder="명령을 입력하세요..."
              disabled={loading}
              style={{
                flex: 1, background: "#0e0e16", border: "1px solid #1e1e28",
                color: "#ccc", fontFamily: BF, fontSize: 12,
                padding: "6px 8px", outline: "none",
              }}
            />
            <button
              onClick={submit}
              disabled={loading || !input.trim()}
              style={{
                all: "unset", cursor: loading ? "not-allowed" : "pointer",
                fontFamily: PF, fontSize: 6,
                background: loading ? "#1a1a28" : "#facc15",
                color: loading ? "#333" : "#000",
                padding: "6px 10px",
              }}
            >▶</button>
          </div>
        </div>
      )}
    </>
  );
}
