import { useState, useCallback } from "react";
import { timeNow } from "../utils/helpers";
import { isConfigured } from "../lib/supabase";
import { AGENTS } from "../data/constants";

export function useLogs() {
  const [logs, setLogs] = useState([]);

  const pushLog = useCallback((msg, emoji = "⚡", color = "#facc15", agent = "System") => {
    setLogs(p => [...p.slice(-80), { agent, color, emoji, msg, time: timeNow() }]);
  }, []);

  const initLogs = useCallback(() => {
    const t = timeNow();
    setLogs([
      { agent: "System", color: "#facc15", emoji: "⚡", msg: "Pixel HQ 시스템 가동 완료", time: t },
      ...AGENTS.map(a => ({ agent: a.name, color: a.body, emoji: a.emoji, msg: `${a.role} 출근 — ${a.task}`, time: t })),
      {
        agent: "System",
        color: isConfigured ? "#4ade80" : "#f59e0b",
        emoji: isConfigured ? "🔗" : "💾",
        msg: isConfigured ? "Supabase 연결됨 — 클라우드 모드" : "오프라인 모드 (localStorage)",
        time: t,
      },
    ]);
  }, []);

  return { logs, pushLog, initLogs };
}
