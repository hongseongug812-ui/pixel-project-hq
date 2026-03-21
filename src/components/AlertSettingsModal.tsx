import { useState } from "react";
import { PF, BF } from "../data/constants";
import { loadUserSettings, MYPAGE_STORAGE_KEY } from "./MyPage";

interface Props {
  onClose: () => void;
  onSave?: () => void;
}

export default function AlertSettingsModal({ onClose, onSave }: Props) {
  const init = loadUserSettings();
  const [discord,   setDiscord]   = useState(init.discordWebhook);
  const [neglect,   setNeglect]   = useState(init.notifyNeglect);
  const [urgent,    setUrgent]    = useState(init.notifyUrgent);
  const [testStatus, setTestStatus] = useState<"idle"|"ok"|"fail">("idle");

  function save() {
    const settings = { discordWebhook: discord.trim(), notifyNeglect: neglect, notifyUrgent: urgent };
    localStorage.setItem(MYPAGE_STORAGE_KEY, JSON.stringify(settings));
    onSave?.();
    onClose();
  }

  async function testDiscord() {
    const url = discord.trim();
    if (!url) { setTestStatus("fail"); return; }
    setTestStatus("idle");
    try {
      const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: "✅ Pixel HQ 알림 연결 테스트 성공!" }),
      });
      setTestStatus(res.ok ? "ok" : "fail");
    } catch { setTestStatus("fail"); }
  }

  const input = (value: string, onChange: (v: string) => void, placeholder: string) => (
    <input
      value={value}
      onChange={e => onChange(e.target.value)}
      placeholder={placeholder}
      style={{ width: "100%", fontFamily: BF, fontSize: 11, color: "#ccc", background: "#0a0a10", border: "1px solid #1a1a28", padding: "5px 8px", outline: "none", boxSizing: "border-box" }}
    />
  );

  const toggle = (label: string, checked: boolean, onChange: (v: boolean) => void) => (
    <label style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer" }}>
      <div
        onClick={() => onChange(!checked)}
        style={{ width: 28, height: 14, background: checked ? "#4ade80" : "#1a1a28", border: `1px solid ${checked ? "#4ade80" : "#333"}`, borderRadius: 7, position: "relative", cursor: "pointer", flexShrink: 0 }}
      >
        <div style={{ position: "absolute", top: 2, left: checked ? 14 : 2, width: 8, height: 8, background: checked ? "#000" : "#555", borderRadius: "50%", transition: "left .15s" }} />
      </div>
      <span style={{ fontFamily: BF, fontSize: 11, color: "#888" }}>{label}</span>
    </label>
  );

  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,.75)", zIndex: 900, display: "flex", alignItems: "center", justifyContent: "center" }} onClick={onClose}>
      <div onClick={e => e.stopPropagation()} style={{ background: "#0c0c14", border: "1px solid #facc1533", borderRadius: 4, width: 420, maxWidth: "96vw", padding: 20, display: "flex", flexDirection: "column", gap: 14 }}>

        {/* Header */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <span style={{ fontFamily: PF, fontSize: 7, color: "#facc15", letterSpacing: 2 }}>🔔 알림 설정</span>
          <button onClick={onClose} style={{ all: "unset", cursor: "pointer", fontFamily: PF, fontSize: 8, color: "#555" }}>✕</button>
        </div>

        {/* Discord */}
        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          <div style={{ fontFamily: PF, fontSize: 5, color: "#a78bfa" }}>💬 DISCORD WEBHOOK</div>
          {input(discord, setDiscord, "https://discord.com/api/webhooks/...")}
          <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
            <button onClick={testDiscord} style={{ all: "unset", cursor: "pointer", fontFamily: PF, fontSize: 4, color: "#000", background: "#a78bfa", padding: "3px 10px" }}>테스트</button>
            {testStatus === "ok"   && <span style={{ fontFamily: BF, fontSize: 11, color: "#4ade80" }}>✓ 전송 성공</span>}
            {testStatus === "fail" && <span style={{ fontFamily: BF, fontSize: 11, color: "#ef4444" }}>✗ 실패 (Webhook URL 확인)</span>}
          </div>
        </div>

        {/* 알림 종류 */}
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          <div style={{ fontFamily: PF, fontSize: 5, color: "#555" }}>알림 종류</div>
          {toggle("방치 프로젝트 알림 (7일+)",       neglect, setNeglect)}
          {toggle("긴급 우선순위 / 마감 임박 알림",   urgent,  setUrgent)}
        </div>

        {/* Save */}
        <button onClick={save} style={{ all: "unset", cursor: "pointer", fontFamily: PF, fontSize: 6, color: "#000", background: "#4ade80", padding: "8px", textAlign: "center" }}>
          저장
        </button>
      </div>
    </div>
  );
}
