import { createContext, useContext, useState, useCallback, ReactNode } from "react";
import { timeNow } from "../utils/helpers";
import { isConfigured } from "../lib/supabase";
import { AGENTS } from "../data/constants";
import type { LogEntry } from "../types";

interface LogsContextValue {
  logs: LogEntry[];
  pushLog: (msg: string, emoji?: string, color?: string, agent?: string) => void;
  initLogs: () => void;
}

const LogsContext = createContext<LogsContextValue | null>(null);

export function LogsProvider({ children }: { children: ReactNode }) {
  const [logs, setLogs] = useState<LogEntry[]>([]);

  const pushLog = useCallback((msg: string, emoji = "⚡", color = "#facc15", agent = "System") => {
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

  return (
    <LogsContext.Provider value={{ logs, pushLog, initLogs }}>
      {children}
    </LogsContext.Provider>
  );
}

export function useLogs(): LogsContextValue {
  const ctx = useContext(LogsContext);
  if (!ctx) throw new Error("useLogs must be used within LogsProvider");
  return ctx;
}
