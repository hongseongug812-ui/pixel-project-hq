import { useEffect, useRef } from "react";
import { AGENTS } from "../data/constants";
import { useLogs } from "../contexts/LogsContext";
import { daysSince } from "../utils/helpers";
import type { Project, ServerStatsMap } from "../types";

const INTERVAL = 45_000; // 45초마다 자율 점검

const rex   = AGENTS.find(a => a.rank === "CEO")!;
const nova  = AGENTS.find(a => a.rank === "CTO")!;
const sage  = AGENTS.find(a => a.rank === "Lead")!;
const hex   = AGENTS.find(a => a.rank === "Senior")!;
const pixel = AGENTS.find(a => a.rank === "Junior")!;

export function useAutoPilot(
  projects: Project[],
  serverStats: ServerStatsMap,
  updateProject: (id: number | string, fields: Partial<Project>) => void,
  addTask: (pid: number | string, text: string) => void,
) {
  const { pushLog } = useLogs();

  // refs — stale closure 방지
  const projectsRef    = useRef(projects);
  const serverStatsRef = useRef(serverStats);
  const updateRef      = useRef(updateProject);
  const addTaskRef     = useRef(addTask);
  const pushLogRef     = useRef(pushLog);
  const done           = useRef<Set<string>>(new Set());

  useEffect(() => { projectsRef.current    = projects;       }, [projects]);
  useEffect(() => { serverStatsRef.current = serverStats;    }, [serverStats]);
  useEffect(() => { updateRef.current      = updateProject;  }, [updateProject]);
  useEffect(() => { addTaskRef.current     = addTask;        }, [addTask]);
  useEffect(() => { pushLogRef.current     = pushLog;        }, [pushLog]);

  useEffect(() => {
    function tick() {
      const projs  = projectsRef.current;
      const stats  = serverStatsRef.current;
      const update = updateRef.current;
      const addT   = addTaskRef.current;
      const log    = pushLogRef.current;
      const d      = new Date().toDateString(); // 하루 1회 dedup 키

      // ── Hex (Senior): 서버 장애 자동 대응 ──────────────────────────
      projs.forEach(p => {
        if (!p.serverUrl) return;
        const stat = stats[p.serverUrl];
        if (!stat) return;

        if (stat.status === "down" && p.status === "active") {
          const key = `server-down-${p.id}-${d}`;
          if (done.current.has(key)) return;
          done.current.add(key);
          update(p.id, { status: "paused" });
          addT(p.id, `🔴 서버 장애 대응: ${p.serverUrl} 즉시 점검 필요`);
          log(`${p.name} 서버 다운 감지 → 자동 일시중단`, hex.emoji, hex.body, hex.name);
        }

        if (stat.status === "up" && p.status === "paused") {
          const downKey = `server-down-${p.id}-${d}`;
          const upKey   = `server-up-${p.id}-${d}`;
          if (done.current.has(downKey) && !done.current.has(upKey)) {
            done.current.add(upKey);
            update(p.id, { status: "active" });
            log(`${p.name} 서버 복구 확인 → 자동 재개`, hex.emoji, hex.body, hex.name);
          }
        }
      });

      // ── Sage (Lead): 방치 프로젝트 긴급 격상 ──────────────────────
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

      // ── Rex (CEO): 마감 임박 전사 긴급 지시 ───────────────────────
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

      // ── Nova (CTO): 장기 정체 기술 부채 경고 ─────────────────────
      projs.forEach(p => {
        if (p.status === "complete" || p.progress > 0) return;
        const days = daysSince(p.lastActivity);
        if (days < 14) return;
        const key = `stagnant-${p.id}-${d}`;
        if (done.current.has(key)) return;
        done.current.add(key);
        addT(p.id, `🔍 진행률 0% 지속 — 아키텍처 재검토 요망`);
        log(`${p.name} ${days}일+ 정체 → 기술 부채 경고 발령`, nova.emoji, nova.body, nova.name);
      });

      // ── Pixel (Junior): 태스크 과부하 경고 로그 ──────────────────
      projs.forEach(p => {
        const pending = p.tasks.filter(t => !t.done).length;
        if (pending < 7 || p.status !== "active") return;
        const key = `overload-${p.id}-${d}`;
        if (done.current.has(key)) return;
        done.current.add(key);
        log(`${p.name} 미완료 ${pending}건 적체 — 태스크 분산 권고`, pixel.emoji, pixel.body, pixel.name);
      });
    }

    const iv   = setInterval(tick, INTERVAL);
    const init = setTimeout(tick, 3000); // 앱 로딩 3초 후 첫 점검
    return () => { clearInterval(iv); clearTimeout(init); };
  }, []); // stable — refs가 최신값 보장
}
