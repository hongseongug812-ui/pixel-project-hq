import { useState, useEffect, useRef, useCallback } from "react";
import type { Project, ServerStat, ServerStatsMap } from "../types";

const HISTORY_MAX = 20;

export type PingHistory = Record<string, number[]>;

async function pingServer(url: string): Promise<{ ping: number; status: "up" | "down" }> {
  // 서버사이드 프록시를 통해 실제 HTTP 상태 코드로 판단 (브라우저 CORS 우회)
  // dev → vite.config.js 미들웨어, prod → api/ping.ts Edge Function
  try {
    const res = await fetch(`/api/ping?url=${encodeURIComponent(url)}`, { method: "GET" });
    if (!res.ok) return { ping: 999, status: "down" };
    const data = await res.json() as { ping: number; status: "up" | "down" };
    return { ping: data.ping, status: data.status };
  } catch {
    return { ping: 999, status: "down" };
  }
}

function recordHistory(prev: PingHistory, url: string, ping: number): PingHistory {
  const hist = prev[url] ?? [];
  return { ...prev, [url]: [...hist.slice(-(HISTORY_MAX - 1)), ping] };
}

export function useServerStats(projects: Project[], tick: number) {
  const [serverStats, setServerStats] = useState<ServerStatsMap>({});
  const [pingHistory, setPingHistory] = useState<PingHistory>({});
  const [pinging, setPinging] = useState<Set<string>>(new Set());
  const checkedRef = useRef<Set<string>>(new Set());

  const applyPingResult = useCallback((url: string, result: { ping: number; status: "up" | "down" }) => {
    const realPing = result.ping < 999 ? result.ping : 999;
    setServerStats(prev => ({
      ...prev,
      [url]: {
        ping: result.status === "up" ? realPing : prev[url]?.ping ?? 30,
        uptime: result.status === "up"
          ? Math.min(100, (prev[url]?.uptime ?? 99.9))
          : Math.max(0, (prev[url]?.uptime ?? 99.9) - 0.5),
        status: result.status,
        lastCheck: new Date().toLocaleTimeString("ko-KR"),
        real: true,
      },
    }));
    setPingHistory(prev => recordHistory(prev, url, realPing));
  }, []);

  // 수동 재핑
  const recheckServer = useCallback(async (url: string) => {
    if (pinging.has(url)) return;
    setPinging(prev => new Set(prev).add(url));
    checkedRef.current.delete(url);
    const result = await pingServer(url);
    applyPingResult(url, result);
    setPinging(prev => { const s = new Set(prev); s.delete(url); return s; });
  }, [pinging, applyPingResult]);

  useEffect(() => {
    const deployed = projects.filter(p => p.serverUrl);
    deployed.forEach(async (p) => {
      if (!p.serverUrl || checkedRef.current.has(p.serverUrl)) return;
      checkedRef.current.add(p.serverUrl);
      const result = await pingServer(p.serverUrl);
      applyPingResult(p.serverUrl, result);
    });
  }, [projects, applyPingResult]);

  useEffect(() => {
    if (tick % 200 !== 0 || tick === 0) return;
    checkedRef.current.clear();
  }, [tick]);

  useEffect(() => {
    if (tick % 20 !== 0) return;
    const deployed = projects.filter(p => p.serverUrl);
    if (!deployed.length) return;
    setServerStats(prev => {
      const next = { ...prev };
      deployed.forEach(p => {
        if (!p.serverUrl) return;
        const ex: ServerStat | undefined = next[p.serverUrl];
        if (!ex || ex.status === "down") return;
        next[p.serverUrl] = {
          ...ex,
          ping: Math.max(5, Math.min(500, ex.ping + (Math.random() - 0.48) * 5)),
          uptime: Math.min(100, Math.max(95, ex.uptime + (Math.random() - 0.5) * 0.02)),
          simulated: !ex.real,
        };
      });
      return next;
    });
  }, [tick, projects]);

  return { serverStats, pingHistory, pinging, recheckServer };
}
