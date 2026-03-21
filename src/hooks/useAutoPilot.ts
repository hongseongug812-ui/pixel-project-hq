import { useEffect, useRef } from "react";
import { AGENTS } from "../data/constants";
import { PHQ_EVENTS } from "../data/events";
import { useLogs } from "../contexts/LogsContext";
import { daysSince } from "../utils/helpers";
import type { Project, ServerStatsMap } from "../types";

const SERVER_INTERVAL    = 15_000; // 서버 체크: 15초
const MANAGE_INTERVAL    = 60_000; // 프로젝트 관리: 60초
const NEGLECT_THRESHOLD  = 7;      // 방치 기준 (일)
const STAGNANT_THRESHOLD = 14;     // 정체 기준 (일)
const OVERLOAD_THRESHOLD = 7;      // 태스크 과부하 기준 (개)
const DEADLINE_WARN_DAYS = 7;      // 마감 임박 경고 기준 (일)

// rank별 에이전트를 안전하게 조회 — 없으면 해당 로직을 건너뜀
function findAgent(rank: string) {
  return AGENTS.find(a => a.rank === rank) ?? null;
};

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
  // 자동 일시중단한 프로젝트 ID 추적 — ref로 관리해 언마운트 시 GC 가능
  const autoPaused     = useRef(new Set<number | string>());

  useEffect(() => {
    projectsRef.current = projects;
    // 삭제된 프로젝트의 ID를 autoPaused에서 정리 (메모리 누수 방지)
    const activeIds = new Set(projects.map(p => p.id));
    autoPaused.current.forEach(id => { if (!activeIds.has(id)) autoPaused.current.delete(id); });
  }, [projects]);
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

        const hex = findAgent("Senior");

        // 서버 다운 → 자동 일시중단
        if (stat.status === "down" && p.status === "active") {
          autoPaused.current.add(p.id);
          update(p.id, { status: "paused" });
          addT(p.id, `🔴 서버 장애: ${p.serverUrl} 즉시 점검 필요`);
          if (hex) {
            log(`${p.name} 서버 다운 → 자동 일시중단`, hex.emoji, hex.body, hex.name);
            window.dispatchEvent(new CustomEvent(PHQ_EVENTS.FEED, { detail: { agentId: hex.id, content: `🔴 [${p.name}] 서버 장애 감지! ${p.serverUrl} — 즉시 점검에 들어갑니다.`, channel: "ops" } }));
          }
        }

        // 서버 복구 → 자동 재개 (autopilot이 중단시킨 것만)
        if (stat.status === "up" && p.status === "paused" && autoPaused.current.has(p.id)) {
          autoPaused.current.delete(p.id);
          update(p.id, { status: "active" });
          if (hex) {
            log(`${p.name} 서버 복구 → 자동 재개`, hex.emoji, hex.body, hex.name);
            window.dispatchEvent(new CustomEvent(PHQ_EVENTS.FEED, { detail: { agentId: hex.id, content: `✅ [${p.name}] 서버 복구 확인. 자동 재개 처리했습니다.`, channel: "ops" } }));
          }
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

      // done Set 정리 — 현재 시간 이전 hour 키 제거 (메모리 누수 방지)
      done.current.forEach(key => {
        const hourMatch = key.match(/\d{4}-\d{2}-\d{2}T\d{2}/);
        if (hourMatch && hourMatch[0] < d) done.current.delete(key);
      });

      const sage  = findAgent("Lead");
      const rex   = findAgent("CEO");
      const nova  = findAgent("CTO");
      const pixel = findAgent("Junior");

      // Sage (Lead): 방치 프로젝트 긴급 격상
      projs.forEach(p => {
        if (p.status === "complete" || p.status === "paused") return;
        const days = daysSince(p.lastActivity);
        if (days < NEGLECT_THRESHOLD || p.priority === "high") return;
        const key = `neglect-${p.id}-${d}`;
        if (done.current.has(key)) return;
        done.current.add(key);
        update(p.id, { priority: "high" });
        addT(p.id, `⚠️ ${days}일 방치 — 즉시 재개 필요`);
        if (sage) {
          log(`${p.name} ${days}일 방치 → priority HIGH 격상`, sage.emoji, sage.body, sage.name);
          window.dispatchEvent(new CustomEvent(PHQ_EVENTS.FEED, { detail: { agentId: sage.id, content: `⚠️ [${p.name}] ${days}일째 업데이트 없음. 팀 전체 주의 요망 — 즉시 상태 확인 부탁드립니다.`, channel: "general" } }));
        }
      });

      // Rex (CEO): 마감 임박 전사 긴급 지시
      projs.forEach(p => {
        if (!p.targetDate || p.status === "complete") return;
        const daysLeft = Math.ceil((new Date(p.targetDate).getTime() - Date.now()) / 86_400_000);
        if (daysLeft > DEADLINE_WARN_DAYS || daysLeft < 0 || p.priority === "high") return;
        const key = `deadline-${p.id}-${d}`;
        if (done.current.has(key)) return;
        done.current.add(key);
        update(p.id, { priority: "high" });
        if (rex) {
          log(`${p.name} 마감 D-${daysLeft} — 전사 긴급 지정`, rex.emoji, rex.body, rex.name);
          window.dispatchEvent(new CustomEvent(PHQ_EVENTS.FEED, { detail: { agentId: rex.id, content: `📢 [${p.name}] 마감 D-${daysLeft}. 전사 긴급 우선순위로 격상합니다. 모든 팀원은 해당 프로젝트에 집중해주세요.`, channel: "announcements" } }));
        }
      });

      // Nova (CTO): 장기 정체 기술 부채 경고
      projs.forEach(p => {
        if (p.status === "complete" || p.progress > 0) return;
        const days = daysSince(p.lastActivity);
        if (days < STAGNANT_THRESHOLD) return;
        const key = `stagnant-${p.id}-${d}`;
        if (done.current.has(key)) return;
        done.current.add(key);
        addT(p.id, `🔍 진행률 0% 지속 — 아키텍처 재검토 요망`);
        if (nova) log(`${p.name} ${days}일+ 정체 → 기술 부채 경고`, nova.emoji, nova.body, nova.name);
      });

      // Pixel (Junior): 태스크 과부하 경고
      projs.forEach(p => {
        const pending = p.tasks.filter(t => !t.done).length;
        if (pending < OVERLOAD_THRESHOLD || p.status !== "active") return;
        const key = `overload-${p.id}-${d}`;
        if (done.current.has(key)) return;
        done.current.add(key);
        if (pixel) log(`${p.name} 미완료 ${pending}건 적체 — 태스크 분산 권고`, pixel.emoji, pixel.body, pixel.name);
      });
    }

    const iv   = setInterval(manageTick, MANAGE_INTERVAL);
    const init = setTimeout(manageTick, 5000);
    return () => { clearInterval(iv); clearTimeout(init); };
  }, []);
}
