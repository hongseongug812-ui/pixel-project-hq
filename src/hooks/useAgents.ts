import { useState, useEffect, useRef } from "react";
import { AGENTS, ROOMS } from "../data/constants";
import { useLogs } from "../contexts/LogsContext";
import { daysSince } from "../utils/helpers";
import type { AgentState, Project, RoomKey } from "../types";

const LOG_ACTIONS: Array<(p: { name: string }) => string> = [
  p => `${p.name} 코드 리뷰 완료`,
  p => `${p.name} 보안 스캔 ✓`,
  p => `${p.name} 의존성 업데이트 확인`,
  p => `${p.name} 테스트 실행 중...`,
  () => `서버 헬스체크 ✓`,
  p => `${p.name} 방치 상태 점검`,
  p => `${p.name} 성능 프로파일링`,
  p => `${p.name} 배포 파이프라인 확인`,
  p => `${p.name} 문서 자동 갱신`,
  p => `${p.name} 에러 로그 분석`,
  p => `${p.name} CI/CD 파이프라인 실행`,
  () => `서버 응답시간 정상`,
  p => `${p.name} 데이터베이스 백업 완료`,
];

// 위기 프로젝트 감지: 긴급 우선순위 + (5일이상 방치 or 미완료 태스크 5개 이상)
function detectCrisisProject(projects: Project[]): boolean {
  return projects.some(p =>
    p.priority === "high" &&
    p.status !== "complete" &&
    (daysSince(p.lastActivity) >= 5 || p.tasks.filter(t => !t.done).length >= 5)
  );
}

export function useAgents(projects: Project[]) {
  const { pushLog } = useLogs();
  const [agentState, setAgentState] = useState<AgentState[]>(() =>
    AGENTS.map((a, i) => ({
      ...a,
      room: ROOMS[i % ROOMS.length].key,
      x: 20 + Math.random() * 100,
      y: 50 + Math.random() * 80,
      frame: 0,
      dx: 0.3 + Math.random() * 0.5,
      currentTask: a.task,
    }))
  );
  const [tick, setTick] = useState(0);
  const [isMeetingActive, setIsMeetingActive] = useState(false);

  // 회의 상태를 ref로 관리 (stale closure 방지)
  const meetingRef = useRef<{ active: boolean; ticksLeft: number; agentIds: string[] }>({
    active: false, ticksLeft: 0, agentIds: [],
  });

  // 180ms마다 캐릭터 이동
  useEffect(() => {
    const iv = setInterval(() => {
      setTick(t => t + 1);
      setAgentState(prev => prev.map(a => {
        const rm = ROOMS.find(r => r.key === a.room);
        const maxX = rm ? rm.w - 30 : 160;
        let nx = a.x + a.dx, nd = a.dx;
        if (nx > maxX || nx < 15) { nd = -nd; nx = a.x + nd; }
        return { ...a, x: nx, dx: nd, frame: a.frame + 1 };
      }));
    }, 180);
    return () => clearInterval(iv);
  }, []);

  // tick마다 회의 카운트다운 처리
  useEffect(() => {
    if (!meetingRef.current.active) return;
    meetingRef.current.ticksLeft -= 1;
    if (meetingRef.current.ticksLeft <= 0) {
      meetingRef.current.active = false;
      const ids = meetingRef.current.agentIds;
      meetingRef.current.agentIds = [];
      setIsMeetingActive(false);
      // 회의 끝난 에이전트를 담당 방 or 랜덤 방으로 복귀
      setAgentState(prev => prev.map(a => {
        if (!ids.includes(a.id)) return a;
        const assignedProject = projects.find(p => p.assignedAgentId === a.id);
        const returnRoom = assignedProject
          ? (ROOMS.find(r => r.key === assignedProject.room) ?? ROOMS[0])
          : ROOMS[Math.floor(Math.random() * ROOMS.length)];
        return { ...a, room: returnRoom.key as RoomKey, x: 20 + Math.random() * 80, y: 50 + Math.random() * 60, currentTask: AGENTS.find(ag => ag.id === a.id)?.task ?? a.task };
      }));
      pushLog("긴급 회의 종료 — 액션 플랜 수립됨", "✅", "#4ade80");
    }
  }, [tick]);

  // 25틱마다: 방 이동 + 위기 감지 → 회의 소집
  useEffect(() => {
    if (tick % 25 !== 0 || tick === 0) return;

    // 담당 프로젝트 → 방 맵 빌드
    const assignedRoomMap = new Map<string, RoomKey>();
    projects.forEach(p => {
      if (p.assignedAgentId) assignedRoomMap.set(p.assignedAgentId, p.room as RoomKey);
    });

    // 위기 감지 → 회의 소집
    if (detectCrisisProject(projects) && !meetingRef.current.active) {
      const shuffledIds = [...agentState].sort(() => Math.random() - 0.5).slice(0, 2 + Math.floor(Math.random() * 2)).map(a => a.id);
      meetingRef.current = { active: true, ticksLeft: 35, agentIds: shuffledIds };
      setIsMeetingActive(true);
      setAgentState(prev => prev.map(a =>
        shuffledIds.includes(a.id)
          ? { ...a, room: "meeting" as RoomKey, x: 30 + Math.random() * 60, y: 50 + Math.random() * 50, currentTask: "긴급 회의 중" }
          : a
      ));
      pushLog("긴급 회의 소집 — 위기 프로젝트 대응", "📋", "#f472b6");
      return; // 이번 틱은 방 이동 건너뜀
    }

    // 일반 방 이동 (회의 중인 에이전트 제외)
    setAgentState(prev => {
      const c = [...prev];
      // 회의 중인 에이전트는 건드리지 않음
      const meetingIds = new Set(meetingRef.current.agentIds);
      const i = (() => {
        let candidate: number;
        let attempts = 0;
        do {
          candidate = Math.floor(Math.random() * c.length);
          attempts++;
        } while (meetingIds.has(c[candidate].id) && attempts < 10);
        return candidate;
      })();
      if (meetingIds.has(c[i].id)) return c;

      const assignedRoom = assignedRoomMap.get(c[i].id);
      const rm = assignedRoom && Math.random() < 0.8
        ? (ROOMS.find(r => r.key === assignedRoom) ?? ROOMS[Math.floor(Math.random() * ROOMS.length)])
        : ROOMS[Math.floor(Math.random() * ROOMS.length)];

      const action = LOG_ACTIONS[Math.floor(Math.random() * LOG_ACTIONS.length)];
      const proj = projects.length ? projects[Math.floor(Math.random() * projects.length)] : { name: "시스템" };
      const msg = action(proj);
      c[i] = { ...c[i], room: rm.key as RoomKey, x: 20 + Math.random() * 80, y: 50 + Math.random() * 60, currentTask: msg.replace((proj.name || "") + " ", "") };
      pushLog(msg, c[i].emoji, c[i].body, c[i].name);
      return c;
    });
  }, [tick, projects, pushLog]);

  return { agentState, tick, isMeetingActive };
}
