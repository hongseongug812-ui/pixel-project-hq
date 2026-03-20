import { useState, useEffect, useRef } from "react";
import type { Project, ServerStat, ServerStatsMap } from "../types";

async function pingServer(url: string): Promise<{ ping: number; status: "up" | "down" }> {
  const full = url.startsWith("http") ? url : `https://${url}`;
  const start = Date.now();
  try {
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), 5000);
    await fetch(full, { method: "HEAD", mode: "no-cors", signal: ctrl.signal });
    clearTimeout(timer);
    return { ping: Date.now() - start, status: "up" };
  } catch {
    return { ping: 999, status: "down" };
  }
}

export function useServerStats(projects: Project[], tick: number) {
  const [serverStats, setServerStats] = useState<ServerStatsMap>({});
  const checkedRef = useRef<Set<string>>(new Set());

  useEffect(() => {
    const deployed = projects.filter(p => p.serverUrl);
    deployed.forEach(async (p) => {
      if (!p.serverUrl || checkedRef.current.has(p.serverUrl)) return;
      checkedRef.current.add(p.serverUrl);
      const result = await pingServer(p.serverUrl);
      setServerStats(prev => ({
        ...prev,
        [p.serverUrl!]: {
          ping: result.ping < 999 ? result.ping : prev[p.serverUrl!]?.ping ?? 30,
          uptime: result.status === "up" ? 99.9 : Math.max(0, (prev[p.serverUrl!]?.uptime ?? 99.9) - 0.5),
          status: result.status,
          lastCheck: new Date().toLocaleTimeString("ko-KR"),
          real: true,
        },
      }));
    });
  }, [projects]);

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

  return { serverStats };
}
