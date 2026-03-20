import { useState, useEffect } from "react";
import { AGENTS } from "../data/constants";
import { PF, BF } from "../data/constants";

export const MYPAGE_STORAGE_KEY = "phq_user_settings";

export interface UserSettings {
  discordWebhook: string;
  telegramToken: string;
  telegramChatId: string;
  notifyNeglect: boolean;
  notifyUrgent: boolean;
}

export function loadUserSettings(): UserSettings {
  try {
    const raw = localStorage.getItem(MYPAGE_STORAGE_KEY);
    if (raw) return { ...defaultSettings(), ...JSON.parse(raw) };
  } catch { /* ignore */ }
  return defaultSettings();
}

function defaultSettings(): UserSettings {
  return { discordWebhook: "", telegramToken: "", telegramChatId: "", notifyNeglect: true, notifyUrgent: true };
}

const RANK_COLOR: Record<string, string> = {
  CEO: "#facc15", CTO: "#f97316", Lead: "#a78bfa", Senior: "#4ade80", Junior: "#60a5fa", Assistant: "#f472b6",
};

interface Props { onClose: () => void; }

export default function MyPage({ onClose }: Props) {
  const [settings, setSettings] = useState<UserSettings>(loadUserSettings);
  const [saved, setSaved] = useState(false);
  const [testStatus, setTestStatus] = useState<"idle" | "sending" | "ok" | "fail">("idle");

  useEffect(() => { setSaved(false); }, [settings]);

  function save() {
    localStorage.setItem(MYPAGE_STORAGE_KEY, JSON.stringify(settings));
    setSaved(true);
  }

  async function testDiscord() {
    if (!settings.discordWebhook.trim()) return;
    setTestStatus("sending");
    try {
      const res = await fetch(settings.discordWebhook.trim(), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: "✅ [Pixel HQ] 디스코드 웹훅 테스트 성공!" }),
      });
      setTestStatus(res.ok ? "ok" : "fail");
    } catch {
      setTestStatus("fail");
    }
    setTimeout(() => setTestStatus("idle"), 3000);
  }

  const inputStyle = {
    fontFamily: BF, fontSize: 13, color: "#ccc", background: "#0a0a10",
    border: "1px solid #2a2a38", padding: "6px 10px", outline: "none",
    width: "100%", boxSizing: "border-box" as const,
  };
  const labelStyle = { fontFamily: PF, fontSize: 5, color: "#555", display: "block" as const, marginBottom: 4 };
  const sectionStyle = { marginBottom: 20 };

  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,.85)", zIndex: 1200, display: "flex", alignItems: "center", justifyContent: "center" }}
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
      <div style={{ background: "#0d0d16", border: "1px solid #1e1e2e", width: 520, maxHeight: "90vh", overflowY: "auto", borderRadius: 4 }}>

        {/* Header */}
        <div style={{ padding: "12px 16px", borderBottom: "1px solid #1a1a28", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <span style={{ fontFamily: PF, fontSize: 8, color: "#facc15" }}>⚙ MY PAGE</span>
          <button onClick={onClose} style={{ all: "unset", cursor: "pointer", fontFamily: PF, fontSize: 6, color: "#444", padding: "2px 6px", border: "1px solid #1e1e28" }}>✕ 닫기</button>
        </div>

        <div style={{ padding: 16 }}>
          {/* Notification Settings */}
          <div style={sectionStyle}>
            <div style={{ fontFamily: PF, fontSize: 6, color: "#a78bfa", marginBottom: 12, paddingBottom: 4, borderBottom: "1px solid #1a1a28" }}>📡 알림 설정</div>

            <div style={{ marginBottom: 12 }}>
              <label style={labelStyle}>DISCORD WEBHOOK URL</label>
              <div style={{ display: "flex", gap: 6 }}>
                <input
                  type="text"
                  value={settings.discordWebhook}
                  onChange={e => setSettings(s => ({ ...s, discordWebhook: e.target.value }))}
                  placeholder="https://discord.com/api/webhooks/..."
                  style={{ ...inputStyle, flex: 1 }}
                />
                <button
                  onClick={testDiscord}
                  disabled={!settings.discordWebhook.trim() || testStatus === "sending"}
                  style={{ all: "unset", cursor: "pointer", fontFamily: PF, fontSize: 4, color: "#000", background: testStatus === "ok" ? "#4ade80" : testStatus === "fail" ? "#ef4444" : "#facc15", padding: "0 10px", opacity: !settings.discordWebhook.trim() ? 0.4 : 1 }}>
                  {testStatus === "sending" ? "..." : testStatus === "ok" ? "OK" : testStatus === "fail" ? "FAIL" : "TEST"}
                </button>
              </div>
            </div>

            <div style={{ marginBottom: 12 }}>
              <label style={labelStyle}>TELEGRAM BOT TOKEN</label>
              <input
                type="text"
                value={settings.telegramToken}
                onChange={e => setSettings(s => ({ ...s, telegramToken: e.target.value }))}
                placeholder="1234567890:AAG..."
                style={inputStyle}
              />
            </div>

            <div style={{ marginBottom: 12 }}>
              <label style={labelStyle}>TELEGRAM CHAT ID</label>
              <input
                type="text"
                value={settings.telegramChatId}
                onChange={e => setSettings(s => ({ ...s, telegramChatId: e.target.value }))}
                placeholder="-1001234567890"
                style={inputStyle}
              />
            </div>

            <div style={{ display: "flex", gap: 16 }}>
              {[
                { key: "notifyNeglect" as const, label: "방치 알림 (3일+)" },
                { key: "notifyUrgent" as const, label: "긴급 태스크 알림" },
              ].map(({ key, label }) => (
                <label key={key} style={{ display: "flex", alignItems: "center", gap: 6, cursor: "pointer" }}>
                  <input
                    type="checkbox"
                    checked={settings[key]}
                    onChange={e => setSettings(s => ({ ...s, [key]: e.target.checked }))}
                    style={{ accentColor: "#4ade80", width: 12, height: 12 }}
                  />
                  <span style={{ fontFamily: BF, fontSize: 12, color: "#666" }}>{label}</span>
                </label>
              ))}
            </div>
          </div>

          {/* Agent Roster */}
          <div style={sectionStyle}>
            <div style={{ fontFamily: PF, fontSize: 6, color: "#4cc9f0", marginBottom: 12, paddingBottom: 4, borderBottom: "1px solid #1a1a28" }}>🤖 AI 에이전트 로스터</div>
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {AGENTS.map(agent => (
                <div key={agent.id} style={{ background: "#0a0a12", border: `1px solid ${agent.body}22`, padding: "10px 12px", borderRadius: 3, display: "flex", gap: 12, alignItems: "flex-start" }}>
                  {/* Avatar dot */}
                  <div style={{ width: 28, height: 28, borderRadius: "50%", background: agent.body, flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 14 }}>
                    {agent.emoji}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 3 }}>
                      <span style={{ fontFamily: PF, fontSize: 6, color: agent.body }}>{agent.name}</span>
                      <span style={{ fontFamily: PF, fontSize: 4, color: RANK_COLOR[agent.rank] ?? "#888", background: `${RANK_COLOR[agent.rank] ?? "#888"}18`, border: `1px solid ${RANK_COLOR[agent.rank] ?? "#888"}44`, padding: "1px 5px" }}>
                        {agent.rank}
                      </span>
                      <span style={{ fontFamily: BF, fontSize: 11, color: "#444" }}>{agent.role}</span>
                    </div>
                    <div style={{ fontFamily: PF, fontSize: 4, color: "#4cc9f0", marginBottom: 3 }}>🤖 {agent.aiModel}</div>
                    <div style={{ fontFamily: BF, fontSize: 11, color: "#555", lineHeight: 1.5 }}>{agent.personality}</div>
                    <div style={{ fontFamily: BF, fontSize: 11, color: "#333", marginTop: 3 }}>▶ {agent.task}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Save */}
          <div style={{ display: "flex", gap: 8, justifyContent: "flex-end", paddingTop: 8, borderTop: "1px solid #1a1a28" }}>
            {saved && <span style={{ fontFamily: BF, fontSize: 12, color: "#4ade80", alignSelf: "center" }}>✓ 저장됨</span>}
            <button onClick={save} style={{ all: "unset", cursor: "pointer", fontFamily: PF, fontSize: 6, color: "#000", background: "#4ade80", padding: "6px 16px", boxShadow: "0 0 8px #4ade8044" }}>
              저장
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
