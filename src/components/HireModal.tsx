import { useState } from "react";
import { PF, BF } from "../data/constants";
import type { Agent } from "../types";

const RANKS = ["Junior", "Senior", "Lead", "CTO", "Assistant"] as const;
const AI_MODELS = ["GPT-4o", "GPT-4o mini", "GPT-4 Turbo", "o1", "o1-mini"] as const;
const BODY_COLORS = [
  "#facc15", "#f97316", "#ef4444", "#a78bfa", "#4ade80",
  "#60a5fa", "#f472b6", "#4cc9f0", "#80ed99", "#ffd166",
];
const EMOJIS = ["🤖", "👾", "🧑‍💻", "🦾", "🐱", "🦊", "🐧", "🦁", "🐸", "⚡", "🎯", "🚀", "💡", "🔮", "🧬"];

interface Props {
  onHire: (agent: Omit<Agent, "id">) => void;
  onClose: () => void;
}

export default function HireModal({ onHire, onClose }: Props) {
  const [name, setName] = useState("");
  const [role, setRole] = useState("");
  const [rank, setRank] = useState<typeof RANKS[number]>("Junior");
  const [aiModel, setAiModel] = useState<typeof AI_MODELS[number]>("GPT-4o mini");
  const [personality, setPersonality] = useState("");
  const [task, setTask] = useState("");
  const [body, setBody] = useState("#60a5fa");
  const [emoji, setEmoji] = useState("🤖");

  const valid = name.trim() && role.trim() && personality.trim();

  function hire() {
    if (!valid) return;
    onHire({
      name: name.trim(),
      role: role.trim(),
      rank,
      aiModel,
      personality: personality.trim(),
      task: task.trim() || `${role.trim()} 업무 수행`,
      body,
      emoji,
      hair: body,
      skin: "#f5cba7",
      shirt: body,
      pants: "#1a1a2e",
    });
    onClose();
  }

  const inputStyle = {
    fontFamily: BF, fontSize: 13, color: "#ccc", background: "#0a0a10",
    border: "1px solid #2a2a38", padding: "6px 10px", outline: "none",
    width: "100%", boxSizing: "border-box" as const,
  };
  const labelStyle = { fontFamily: PF, fontSize: 4, color: "#555", display: "block" as const, marginBottom: 4 };

  return (
    <div
      role="dialog" aria-modal="true" aria-labelledby="hire-modal-title"
      style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,.85)", zIndex: 1200, display: "flex", alignItems: "center", justifyContent: "center" }}
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div style={{ background: "#0d0d16", border: "1px solid #1e1e2e", width: 480, maxHeight: "90vh", overflowY: "auto", borderRadius: 4 }}>
        {/* Header */}
        <div style={{ padding: "12px 16px", borderBottom: "1px solid #1a1a28", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <span id="hire-modal-title" style={{ fontFamily: PF, fontSize: 8, color: "#4cc9f0" }}>🤖 에이전트 채용</span>
          <button onClick={onClose} aria-label="닫기" style={{ all: "unset", cursor: "pointer", fontFamily: PF, fontSize: 6, color: "#444", padding: "2px 6px", border: "1px solid #1e1e28" }}>✕</button>
        </div>

        <div style={{ padding: 16, display: "flex", flexDirection: "column", gap: 14 }}>
          {/* Preview */}
          <div style={{ display: "flex", alignItems: "center", gap: 14, padding: "10px 12px", background: "#0a0a12", border: `1px solid ${body}33`, borderRadius: 3 }}>
            <div style={{ width: 44, height: 44, borderRadius: "50%", background: body, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 22, boxShadow: `0 0 12px ${body}66`, flexShrink: 0 }}>
              {emoji}
            </div>
            <div>
              <div style={{ fontFamily: PF, fontSize: 7, color: body }}>{name || "이름 미설정"}</div>
              <div style={{ fontFamily: BF, fontSize: 12, color: "#555", marginTop: 2 }}>{role || "역할 미설정"} · {rank}</div>
              <div style={{ fontFamily: PF, fontSize: 4, color: "#4cc9f0", marginTop: 2 }}>🤖 {aiModel}</div>
            </div>
          </div>

          {/* Name & Role */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
            <div>
              <label style={labelStyle}>이름 *</label>
              <input value={name} onChange={e => setName(e.target.value.slice(0, 12))} placeholder="e.g. Echo" style={inputStyle} />
            </div>
            <div>
              <label style={labelStyle}>역할 *</label>
              <input value={role} onChange={e => setRole(e.target.value.slice(0, 20))} placeholder="e.g. Data Analyst" style={inputStyle} />
            </div>
          </div>

          {/* Rank & Model */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
            <div>
              <label style={labelStyle}>계급</label>
              <select value={rank} onChange={e => setRank(e.target.value as typeof rank)} style={{ ...inputStyle, cursor: "pointer" }}>
                {RANKS.map(r => <option key={r} value={r}>{r}</option>)}
              </select>
            </div>
            <div>
              <label style={labelStyle}>AI 모델</label>
              <select value={aiModel} onChange={e => setAiModel(e.target.value as typeof aiModel)} style={{ ...inputStyle, cursor: "pointer" }}>
                {AI_MODELS.map(m => <option key={m} value={m}>{m}</option>)}
              </select>
            </div>
          </div>

          {/* Personality */}
          <div>
            <label style={labelStyle}>성격 / 역할 설명 *</label>
            <textarea
              value={personality}
              onChange={e => setPersonality(e.target.value.slice(0, 200))}
              placeholder="이 에이전트의 성격, 전문성, 말투를 설명하세요..."
              rows={3}
              style={{ ...inputStyle, resize: "vertical" }}
            />
          </div>

          {/* Task */}
          <div>
            <label style={labelStyle}>기본 업무</label>
            <input value={task} onChange={e => setTask(e.target.value.slice(0, 60))} placeholder="주로 담당하는 업무..." style={inputStyle} />
          </div>

          {/* Color */}
          <div>
            <label style={labelStyle}>바디 컬러</label>
            <div style={{ display: "flex", gap: 6, flexWrap: "wrap", alignItems: "center" }}>
              {BODY_COLORS.map(c => (
                <div
                  key={c}
                  onClick={() => setBody(c)}
                  style={{ width: 22, height: 22, borderRadius: "50%", background: c, cursor: "pointer", border: `2px solid ${body === c ? "#fff" : "transparent"}`, boxShadow: body === c ? `0 0 8px ${c}` : "none" }}
                />
              ))}
              <label style={{ width: 22, height: 22, borderRadius: "50%", background: "#1a1a28", border: "1px dashed #333", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 10, color: "#555" }}>
                +
                <input type="color" value={body} onChange={e => setBody(e.target.value)} style={{ opacity: 0, position: "absolute", width: 0, height: 0 }} />
              </label>
            </div>
          </div>

          {/* Emoji */}
          <div>
            <label style={labelStyle}>이모지</label>
            <div style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>
              {EMOJIS.map(em => (
                <button
                  key={em}
                  onClick={() => setEmoji(em)}
                  style={{ all: "unset", cursor: "pointer", width: 28, height: 28, borderRadius: 4, background: emoji === em ? `${body}33` : "#111118", border: `1px solid ${emoji === em ? body : "#1e1e28"}`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 16 }}
                >
                  {em}
                </button>
              ))}
            </div>
          </div>

          {/* Actions */}
          <div style={{ display: "flex", gap: 8, justifyContent: "flex-end", paddingTop: 8, borderTop: "1px solid #1a1a28" }}>
            <button onClick={onClose} style={{ all: "unset", cursor: "pointer", fontFamily: PF, fontSize: 5, color: "#555", border: "1px solid #1e1e28", padding: "6px 14px" }}>취소</button>
            <button
              onClick={hire}
              disabled={!valid}
              style={{ all: "unset", cursor: valid ? "pointer" : "default", fontFamily: PF, fontSize: 6, color: "#000", background: valid ? "#4cc9f0" : "#1a1a28", padding: "6px 16px", opacity: valid ? 1 : 0.4 }}
            >
              🤖 채용하기
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
