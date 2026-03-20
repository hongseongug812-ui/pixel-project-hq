import { useState, useRef, useEffect } from "react";
import { PF, BF } from "../data/constants";
import type { Agent } from "../types";

const RANK_COLOR: Record<string, string> = {
  CEO: "#facc15", CTO: "#f97316", Lead: "#a78bfa", Senior: "#4ade80", Junior: "#60a5fa", Assistant: "#f472b6",
};

const GPT_MODEL: Record<string, string> = {
  "GPT-4o": "gpt-4o",
  "GPT-4o mini": "gpt-4o-mini",
  "GPT-4 Turbo": "gpt-4-turbo",
  "o1": "o1",
  "o1-mini": "o1-mini",
};

const MAX_HISTORY = 40; // 저장할 최대 메시지 수

interface Message { role: "user" | "assistant"; content: string; }

interface Props {
  agent: Agent;
  onClose: () => void;
}

function historyKey(agentId: string) { return `phq_agent_chat_${agentId}`; }

function loadHistory(agentId: string): Message[] {
  try {
    const raw = localStorage.getItem(historyKey(agentId));
    if (raw) return JSON.parse(raw) as Message[];
  } catch { /* ignore */ }
  return [];
}

function saveHistory(agentId: string, msgs: Message[]) {
  try {
    localStorage.setItem(historyKey(agentId), JSON.stringify(msgs.slice(-MAX_HISTORY)));
  } catch { /* ignore */ }
}

export default function AgentChat({ agent, onClose }: Props) {
  const greeting: Message = {
    role: "assistant",
    content: `${agent.emoji} 안녕하세요. 저는 ${agent.name}입니다. [${agent.rank}]\n${agent.personality.split(". ")[0]}.`,
  };

  const [messages, setMessages] = useState<Message[]>(() => {
    const history = loadHistory(agent.id);
    return history.length > 0 ? history : [greeting];
  });
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    saveHistory(agent.id, messages);
  }, [agent.id, messages]);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [onClose]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  async function send() {
    const text = input.trim();
    if (!text || loading) return;
    setInput("");
    const userMsg: Message = { role: "user", content: text };
    setMessages(prev => [...prev, userMsg]);
    setLoading(true);

    const API_KEY = (import.meta.env.VITE_OPENAI_API_KEY as string | undefined)?.trim();
    if (!API_KEY) {
      setMessages(prev => [...prev, { role: "assistant", content: "⚠️ OpenAI API 키가 없습니다." }]);
      setLoading(false);
      return;
    }

    const systemPrompt = `당신은 Pixel Project HQ의 ${agent.name}입니다.
계급: ${agent.rank} | 역할: ${agent.role} | AI 모델: ${agent.aiModel}
성격: ${agent.personality}

계급과 성격에 맞는 어조로 한국어로 답변하세요.
- CEO는 전략적이고 결단력 있게
- CTO는 기술적 근거를 중시하며 엄격하게
- Lead는 팀 조율 중심으로 균형 있게
- Senior는 실행 경험 기반으로 실용적으로
- Junior는 열정적이고 배우려는 자세로
- Assistant는 친절하고 빠르게
짧고 명확하게, 자신의 전문 분야 관점에서 대화하세요.`;

    try {
      const model = GPT_MODEL[agent.aiModel] ?? "gpt-4o-mini";
      const history = [...messages, userMsg].map(m => ({ role: m.role, content: m.content }));
      const res = await fetch("https://api.openai.com/v1/chat/completions", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${API_KEY}` },
        body: JSON.stringify({
          model,
          max_tokens: 400,
          messages: [{ role: "system", content: systemPrompt }, ...history],
        }),
      });
      const data = await res.json() as { choices: [{ message: { content: string } }] };
      const reply = data.choices[0].message.content.trim();
      setMessages(prev => [...prev, { role: "assistant", content: reply }]);
    } catch {
      setMessages(prev => [...prev, { role: "assistant", content: "오류가 발생했습니다." }]);
    } finally {
      setLoading(false);
    }
  }

  const rankColor = RANK_COLOR[agent.rank] ?? "#888";

  return (
    <div style={{
      position: "fixed", bottom: 16, left: 16, width: 300, height: 420,
      background: "#0d0d16", border: `1px solid ${rankColor}44`,
      borderRadius: 4, zIndex: 900, display: "flex", flexDirection: "column",
      boxShadow: `0 0 20px ${rankColor}22`,
    }}>
      {/* Header */}
      <div style={{ padding: "8px 10px", borderBottom: `1px solid ${rankColor}33`, display: "flex", alignItems: "center", gap: 8, background: "#0a0a12" }}>
        <div style={{ width: 28, height: 28, borderRadius: "50%", background: agent.body, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 14, flexShrink: 0 }}>
          {agent.emoji}
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
            <span style={{ fontFamily: PF, fontSize: 6, color: agent.body }}>{agent.name}</span>
            <span style={{ fontFamily: PF, fontSize: 4, color: rankColor, background: `${rankColor}18`, border: `1px solid ${rankColor}44`, padding: "1px 4px" }}>
              {agent.rank}
            </span>
          </div>
          <div style={{ fontFamily: PF, fontSize: 4, color: "#4cc9f0", marginTop: 1 }}>🤖 {agent.aiModel}</div>
        </div>
        <button onClick={() => { const reset = [greeting]; setMessages(reset); saveHistory(agent.id, reset); }} style={{ all: "unset", cursor: "pointer", fontFamily: PF, fontSize: 4, color: "#555", background: "#111118", border: "1px solid #1e1e28", padding: "3px 6px", borderRadius: 2, lineHeight: 1, marginRight: 4 }}>CLR</button>
        <button onClick={onClose} style={{ all: "unset", cursor: "pointer", fontFamily: PF, fontSize: 7, color: "#888", background: "#1a1a24", border: `1px solid ${rankColor}44`, padding: "3px 7px", borderRadius: 2, lineHeight: 1 }}>✕</button>
      </div>

      {/* Messages */}
      <div style={{ flex: 1, overflowY: "auto", padding: "10px 10px 4px", display: "flex", flexDirection: "column", gap: 8 }}>
        {messages.map((m, i) => (
          <div key={i} style={{ display: "flex", justifyContent: m.role === "user" ? "flex-end" : "flex-start" }}>
            {m.role === "assistant" && (
              <div style={{ width: 18, height: 18, borderRadius: "50%", background: agent.body, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 10, flexShrink: 0, marginRight: 5, alignSelf: "flex-end" }}>
                {agent.emoji}
              </div>
            )}
            <div style={{
              maxWidth: "75%", padding: "6px 9px", borderRadius: 3,
              background: m.role === "user" ? `${rankColor}22` : "#141420",
              border: `1px solid ${m.role === "user" ? rankColor + "44" : "#1e1e2e"}`,
              fontFamily: BF, fontSize: 12, color: m.role === "user" ? "#ddd" : "#bbb",
              lineHeight: 1.5, whiteSpace: "pre-wrap",
            }}>
              {m.content}
            </div>
          </div>
        ))}
        {loading && (
          <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
            <div style={{ width: 18, height: 18, borderRadius: "50%", background: agent.body, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 10 }}>
              {agent.emoji}
            </div>
            <div style={{ display: "flex", gap: 3 }}>
              {[0, 1, 2].map(i => (
                <div key={i} style={{ width: 5, height: 5, borderRadius: "50%", background: rankColor, animation: `blink 1s ${i * 0.2}s steps(2) infinite` }} />
              ))}
            </div>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div style={{ padding: "6px 8px", borderTop: "1px solid #1a1a28", display: "flex", gap: 5 }}>
        <input
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(); } }}
          placeholder={`${agent.name}에게 메시지...`}
          disabled={loading}
          style={{ flex: 1, fontFamily: BF, fontSize: 12, color: "#aaa", background: "#0a0a10", border: "1px solid #1e1e28", padding: "5px 8px", outline: "none" }}
        />
        <button
          onClick={send}
          disabled={loading || !input.trim()}
          style={{ all: "unset", cursor: "pointer", fontFamily: PF, fontSize: 5, color: "#000", background: loading || !input.trim() ? "#1a1a28" : rankColor, padding: "0 9px", opacity: loading || !input.trim() ? 0.5 : 1 }}
        >
          ↑
        </button>
      </div>
    </div>
  );
}
