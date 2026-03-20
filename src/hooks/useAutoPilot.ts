import { useEffect, useRef } from "react";
import { AGENTS } from "../data/constants";
import { useLogs } from "../contexts/LogsContext";
import { daysSince } from "../utils/helpers";
import type { Project, ServerStatsMap } from "../types";

const SERVER_INTERVAL = 15_000; // 서버 체크: 15초
const MANAGE_INTERVAL = 60_000; // 프로젝트 관리: 60초

const rex   = AGENTS.find(a => a.rank === "CEO")!;
const nova  = AGENTS.find(a => a.rank === "CTO")!;
const sage  = AGENTS.find(a => a.rank === "Lead")!;
const hex   = AGENTS.find(a => a.rank === "Senior")!;
const pixel = AGENTS.find(a => a.rank === "Junior")!;

// 프로젝트를 자동 일시중단했는지 추적 (복구 시 자동 재개)
const autoPaused = new Set<number | string>();

export function useAutoPilot(
  projects: Project[],
  serverStats: ServerStatsMap,
  updateProject: (id: number | string, fields: Partial<Project>) => void,
  addTask: (pid: number | string, text: string) => void,
) {
  const { pushLog } = useLogs();

  const projectsRef    = useRef(projects);
  const serverStatsRef = useRef(serverStats);
  const updateRef      = useRef(updateProject);
  const addTaskRef     = useRef(addTask);
  const pushLogRef     = useRef(pushLog);
  const done           = useRef<Set<string>>(new Set());

  useEffect(() => { projectsRef.current    = projects;      }, [projects]);
  useEffect(() => { serverStatsRef.current = serverStats;   }, [serverStats]);
  useEffect(() => { updateRef.current      = updateProject; }, [updateProject]);
  useEffect(() => { addTaskRef.current     = addTask;       }, [addTask]);
  useEffect(() => { pushLogRef.current     = pushLog;       }, [pushLog]);

  // ── 서버 체크 (15초) ────────────────────────────────────────────────
  useEffect(() => {
    function serverTick() {
      const projs  = projectsRef.current;
      const stats  = serverStatsRef.current;
      const update = updateRef.current;
      const addT   = addTaskRef.current;
      const log    = pushLogRef.current;

      projs.forEach(p => {
        if (!p.serverUrl) return;
        const stat = stats[p.serverUrl];
        if (!stat) return;

        // 서버 다운 → 자동 일시중단
        if (stat.status === "down" && p.status === "active") {
          autoPaused.add(p.id);
          update(p.id, { status: "paused" });
          addT(p.id, `🔴 서버 장애: ${p.serverUrl} 즉시 점검 필요`);
          log(`${p.name} 서버 다운 → 자동 일시중단`, hex.emoji, hex.body, hex.name);
        }

        // 서버 복구 → 자동 재개 (autopilot이 중단시킨 것만)
        if (stat.status === "up" && p.status === "paused" && autoPaused.has(p.id)) {
          autoPaused.delete(p.id);
          update(p.id, { status: "active" });
          log(`${p.name} 서버 복구 → 자동 재개`, hex.emoji, hex.body, hex.name);
        }
      });
    }

    const iv   = setInterval(serverTick, SERVER_INTERVAL);
    const init = setTimeout(serverTick, 3000);
    return () => { clearInterval(iv); clearTimeout(init); };
  }, []);

  // ── 프로젝트 관리 (60초) ────────────────────────────────────────────
  useEffect(() => {
    function manageTick() {
      const projs = projectsRef.current;
      const update = updateRef.current;
      const addT   = addTaskRef.current;
      const log    = pushLogRef.current;
      const d      = new Date().toISOString().slice(0, 13); // 시간 단위 dedup

      // Sage (Lead): 방치 프로젝트 긴급 격상
      projs.forEach(p => {
        if (p.status === "complete" || p.status === "paused") return;
        const days = daysSince(p.lastActivity);
        if (days < 7 || p.priority === "high") return;
        const key = `neglect-${p.id}-${d}`;
        if (done.current.has(key)) return;
        done.current.add(key);
        update(p.id, { priority: "high" });
        addT(p.id, `⚠️ ${days}일 방치 — 즉시 재개 필요`);
        log(`${p.name} ${days}일 방치 → priority HIGH 격상`, sage.emoji, sage.body, sage.name);
      });

      // Rex (CEO): 마감 임박 전사 긴급 지시
      projs.forEach(p => {
        if (!p.targetDate || p.status === "complete") return;
        const daysLeft = Math.ceil((new Date(p.targetDate).getTime() - Date.now()) / 864e5);
        if (daysLeft > 7 || daysLeft < 0 || p.priority === "high") return;
        const key = `deadline-${p.id}-${d}`;
        if (done.current.has(key)) return;
        done.current.add(key);
        update(p.id, { priority: "high" });
        log(`${p.name} 마감 D-${daysLeft} — 전사 긴급 지정`, rex.emoji, rex.body, rex.name);
      });

      // Nova (CTO): 장기 정체 기술 부채 경고
      projs.forEach(p => {
        if (p.status === "complete" || p.progress > 0) return;
        const days = daysSince(p.lastActivity);
        if (days < 14) return;
        const key = `stagnant-${p.id}-${d}`;
        if (done.current.has(key)) return;
        done.current.add(key);
        addT(p.id, `🔍 진행률 0% 지속 — 아키텍처 재검토 요망`);
        log(`${p.name} ${days}일+ 정체 → 기술 부채 경고`, nova.emoji, nova.body, nova.name);
      });

      // Pixel (Junior): 태스크 과부하 경고
      projs.forEach(p => {
        const pending = p.tasks.filter(t => !t.done).length;
        if (pending < 7 || p.status !== "active") return;
        const key = `overload-${p.id}-${d}`;
        if (done.current.has(key)) return;
        done.current.add(key);
        log(`${p.name} 미완료 ${pending}건 적체 — 태스크 분산 권고`, pixel.emoji, pixel.body, pixel.name);
      });
    }

    const iv   = setInterval(manageTick, MANAGE_INTERVAL);
    const init = setTimeout(manageTick, 5000);
    return () => { clearInterval(iv); clearTimeout(init); };
  }, []);
}
