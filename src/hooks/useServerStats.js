import { useState, useEffect, useRef } from "react";

// 실제 서버 헬스체크 (no-cors, 타임아웃 5초)
async function pingServer(url) {
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

export function useServerStats(projects, tick) {
  const [serverStats, setServerStats] = useState({});
  const checkedRef = useRef(new Set());

  // 배포 URL이 새로 추가될 때 실제 핑 체크
  useEffect(() => {
    const deployed = projects.filter(p => p.serverUrl);
    deployed.forEach(async (p) => {
      if (checkedRef.current.has(p.serverUrl)) return;
      checkedRef.current.add(p.serverUrl);
      const result = await pingServer(p.serverUrl);
      setServerStats(prev => ({
        ...prev,
        [p.serverUrl]: {
          ping: result.ping < 999 ? result.ping : prev[p.serverUrl]?.ping ?? 30,
          uptime: result.status === "up" ? 99.9 : Math.max(0, (prev[p.serverUrl]?.uptime ?? 99.9) - 0.5),
          status: result.status,
          lastCheck: new Date().toLocaleTimeString("ko-KR"),
          real: true,
        },
      }));
    });
  }, [projects]);

  // 2분마다 재핑
  useEffect(() => {
    if (tick % 200 !== 0 || tick === 0) return;
    checkedRef.current.clear(); // 강제 재체크
  }, [tick]);

  // 소폭 시뮬레이션 (실제 핑 사이 간격 메우기)
  useEffect(() => {
    if (tick % 20 !== 0) return;
    const deployed = projects.filter(p => p.serverUrl);
    if (!deployed.length) return;
    setServerStats(prev => {
      const next = { ...prev };
      deployed.forEach(p => {
        const ex = next[p.serverUrl];
        if (!ex || ex.status === "down") return;
        next[p.serverUrl] = {
          ...ex,
          ping: Math.max(5, Math.min(500, ex.ping + (Math.random() - 0.48) * 5)),
          uptime: Math.min(100, Math.max(95, ex.uptime + (Math.random() - 0.5) * 0.02)),
        };
      });
      return next;
    });
  }, [tick, projects]);

  return { serverStats };
}
