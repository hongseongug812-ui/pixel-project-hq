import { useState, useEffect } from "react";
import { AGENTS } from "../data/constants";
import { PF, BF } from "../data/constants";

export const MYPAGE_STORAGE_KEY = "phq_user_settings";
export const AVATAR_STORAGE_KEY = "phq_my_avatar";

export interface UserSettings {
  discordWebhook: string;
  telegramToken: string;
  telegramChatId: string;
  notifyNeglect: boolean;
  notifyUrgent: boolean;
}

export interface MyAvatar {
  bodyColor: string;
  emoji: string;
  name: string;
}

export function loadUserSettings(): UserSettings {
  try {
    const raw = localStorage.getItem(MYPAGE_STORAGE_KEY);
    if (raw) return { ...defaultSettings(), ...JSON.parse(raw) };
  } catch { /* ignore */ }
  return defaultSettings();
}

export function loadMyAvatar(): MyAvatar {
  try {
    const raw = localStorage.getItem(AVATAR_STORAGE_KEY);
    if (raw) return { ...defaultAvatar(), ...JSON.parse(raw) };
  } catch { /* ignore */ }
  return defaultAvatar();
}

function defaultSettings(): UserSettings {
  return { discordWebhook: "", telegramToken: "", telegramChatId: "", notifyNeglect: true, notifyUrgent: true };
}

function defaultAvatar(): MyAvatar {
  return { bodyColor: "#a78bfa", emoji: "🧑", name: "ME" };
}

const AVATAR_COLORS = [
  "#facc15","#f97316","#ef4444","#a78bfa","#4ade80","#60a5fa","#f472b6","#4cc9f0","#80ed99","#ffd166",
];
const AVATAR_EMOJIS = ["🧑","👤","🙂","😎","🤓","🧠","👑","⚡","🎯","🤝","🦾","🚀","🎮","🐱","🦊"];


const RANK_COLOR: Record<string, string> = {
  CEO: "#facc15", CTO: "#f97316", Lead: "#a78bfa", Senior: "#4ade80", Junior: "#60a5fa", Assistant: "#f472b6",
};

interface Props { onClose: () => void; }

export default function MyPage({ onClose }: Props) {
  const [settings, setSettings] = useState<UserSettings>(loadUserSettings);
  const [avatar, setAvatar] = useState<MyAvatar>(loadMyAvatar);
  const [saved, setSaved] = useState(false);
  const [testStatus, setTestStatus] = useState<"idle" | "sending" | "ok" | "fail">("idle");

  useEffect(() => { setSaved(false); }, [settings, avatar]);

  function save() {
    localStorage.setItem(MYPAGE_STORAGE_KEY, JSON.stringify(settings));
    localStorage.setItem(AVATAR_STORAGE_KEY, JSON.stringify(avatar));
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

          {/* My Character */}
          <div style={sectionStyle}>
            <div style={{ fontFamily: PF, fontSize: 6, color: "#facc15", marginBottom: 12, paddingBottom: 4, borderBottom: "1px solid #1a1a28" }}>🧑 나의 캐릭터</div>

            {/* Preview */}
            <div style={{ display: "flex", alignItems: "center", gap: 16, marginBottom: 14 }}>
              <div style={{ width: 48, height: 48, borderRadius: "50%", background: avatar.bodyColor, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 24, boxShadow: `0 0 16px ${avatar.bodyColor}66`, flexShrink: 0 }}>
                {avatar.emoji}
              </div>
              <div>
                <div style={{ fontFamily: PF, fontSize: 7, color: avatar.bodyColor, marginBottom: 4 }}>{avatar.name || "ME"}</div>
                <div style={{ fontFamily: BF, fontSize: 11, color: "#555" }}>오피스에 표시될 내 캐릭터</div>
              </div>
            </div>

            {/* Name */}
            <div style={{ marginBottom: 10 }}>
              <label style={labelStyle}>닉네임</label>
              <input
                value={avatar.name}
                onChange={e => setAvatar(a => ({ ...a, name: e.target.value.slice(0, 10) }))}
                placeholder="ME"
                style={{ ...inputStyle, width: 160 }}
              />
            </div>

            {/* Color picker */}
            <div style={{ marginBottom: 10 }}>
              <label style={labelStyle}>바디 컬러</label>
              <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                {AVATAR_COLORS.map(c => (
                  <div
                    key={c}
                    onClick={() => setAvatar(a => ({ ...a, bodyColor: c }))}
                    style={{ width: 22, height: 22, borderRadius: "50%", background: c, cursor: "pointer", border: `2px solid ${avatar.bodyColor === c ? "#fff" : "transparent"}`, boxShadow: avatar.bodyColor === c ? `0 0 8px ${c}` : "none" }}
                  />
                ))}
                {/* Custom color */}
                <label style={{ width: 22, height: 22, borderRadius: "50%", background: "#1a1a28", border: "1px dashed #333", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 10, color: "#555" }}>
                  +
                  <input type="color" value={avatar.bodyColor} onChange={e => setAvatar(a => ({ ...a, bodyColor: e.target.value }))} style={{ opacity: 0, position: "absolute", width: 0, height: 0 }} />
                </label>
              </div>
            </div>

            {/* Emoji picker */}
            <div>
              <label style={labelStyle}>이모지</label>
              <div style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>
                {AVATAR_EMOJIS.map(em => (
                  <button
                    key={em}
                    onClick={() => setAvatar(a => ({ ...a, emoji: em }))}
                    style={{ all: "unset", cursor: "pointer", width: 28, height: 28, borderRadius: 4, background: avatar.emoji === em ? `${avatar.bodyColor}33` : "#111118", border: `1px solid ${avatar.emoji === em ? avatar.bodyColor : "#1e1e28"}`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 16 }}
                  >
                    {em}
                  </button>
                ))}
              </div>
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
