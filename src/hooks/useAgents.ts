import { useState, useEffect, useRef } from "react";
import { AGENTS, ROOMS } from "../data/constants";
import { useLogs } from "../contexts/LogsContext";
import { daysSince } from "../utils/helpers";
import type { AgentState, Project, RoomKey } from "../types";

const LOG_ACTIONS: Array<(p: { name: string }) => string> = [
  // 개발 작업
  p => `${p.name} 코드 리뷰 완료`,
  p => `${p.name} 보안 스캔 ✓`,
  p => `${p.name} 의존성 업데이트 확인`,
  p => `${p.name} 테스트 실행 중...`,
  p => `${p.name} 성능 프로파일링`,
  p => `${p.name} CI/CD 파이프라인 실행`,
  // 서버 작업
  () => `서버 헬스체크 ✓`,
  () => `서버 응답시간 정상`,
  p => `${p.name} 배포 파이프라인 확인`,
  // 문서·백업
  p => `${p.name} 문서 자동 갱신`,
  p => `${p.name} 에러 로그 분석`,
  p => `${p.name} 데이터베이스 백업 완료`,
  // 회의·보고
  p => `${p.name} 스프린트 리뷰 참여`,
  p => `${p.name} 진행상황 보고`,
  () => `팀 미팅 — 우선순위 재조정`,
  // 라운지·휴식
  () => `커피 브레이크 ☕`,
  () => `점심 휴식 중 🍱`,
  () => `팀원과 잡담 중`,
];

// task·계급 기반 방 결정
function pickRoom(agent: AgentState, task: string, assignedRoom?: RoomKey): RoomKey {
  const t = task.toLowerCase();

  // 서버 관련 → 서버실
  if (/서버|배포|헬스체크|응답|장애|복구|ping|uptime/.test(t)) return "server";
  // 회의·보고·검토 → 회의실 (단, 회의가 이미 진행 중이 아닐 때)
  if (/회의|보고|검토|리뷰|스프린트|미팅/.test(t)) return "meeting";
  // 휴식·라운지 활동 → 라운지 (주니어·어시스턴트 위주, 가끔)
  if (/커피|휴식|점심|잡담/.test(t)) return "lounge";
  // 문서·테스트·백업 → 창고(storage) 활용
  if (/문서|백업|로그|테스트/.test(t)) return "storage";

  // 계급별 기본 방
  if (agent.rank === "CEO") return "ceo";
  if (agent.rank === "CTO") return Math.random() < 0.6 ? "ceo" : "office";
  if (agent.rank === "Lead") return Math.random() < 0.5 ? "meeting" : "office";
  if (agent.rank === "Senior") return Math.random() < 0.7 ? "office" : "lab";
  if (agent.rank === "Junior") {
    const r = Math.random();
    return r < 0.5 ? "lab" : r < 0.75 ? "office" : "lounge";
  }
  if (agent.rank === "Assistant") {
    const r = Math.random();
    return r < 0.4 ? "office" : r < 0.65 ? "lounge" : "lab";
  }

  // 담당 프로젝트 방 (80% 확률)
  if (assignedRoom && Math.random() < 0.8) return assignedRoom;

  // 완전 랜덤 fallback (모든 방 활용)
  const allRooms: RoomKey[] = ["lab", "office", "server", "ceo", "lounge", "meeting", "storage"];
  return allRooms[Math.floor(Math.random() * allRooms.length)];
}

// 위기 프로젝트 감지: 긴급 우선순위 + (5일이상 방치 or 미완료 태스크 5개 이상)
function detectCrisisProject(projects: Project[]): boolean {
  return projects.some(p =>
    p.priority === "high" &&
    p.status !== "complete" &&
    (daysSince(p.lastActivity) >= 5 || p.tasks.filter(t => !t.done).length >= 5)
  );
}

export function useAgents(projects: Project[], isAIChatOpen = false) {
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

  // AI 채팅 열리면 전원 회의실 집결, 닫히면 복귀
  useEffect(() => {
    if (isAIChatOpen) {
      setIsMeetingActive(true);
      setAgentState(prev => prev.map((a, i) => ({
        ...a, room: "meeting" as RoomKey,
        x: 20 + (i % 3) * 60 + Math.random() * 20,
        y: 50 + Math.floor(i / 3) * 40 + Math.random() * 15,
        currentTask: "AI 채팅 회의 중",
      })));
      pushLog("AI 채팅 시작 — 전 에이전트 회의실 집결", "💬", "#f472b6");
    } else {
      setIsMeetingActive(false);
      setAgentState(prev => prev.map((a, i) => ({
        ...a, room: ROOMS[i % ROOMS.length].key,
        x: 20 + Math.random() * 80,
        y: 50 + Math.random() * 60,
        currentTask: AGENTS[i]?.task ?? a.task,
      })));
    }
  }, [isAIChatOpen]);

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

      const action = LOG_ACTIONS[Math.floor(Math.random() * LOG_ACTIONS.length)];
      const proj = projects.length ? projects[Math.floor(Math.random() * projects.length)] : { name: "시스템" };
      const msg = action(proj);
      const task = msg.replace((proj.name || "") + " ", "");

      // task 내용 + 계급 기반 방 결정
      const roomKey = pickRoom(c[i], task, assignedRoomMap.get(c[i].id));
      const rm = ROOMS.find(r => r.key === roomKey) ?? ROOMS[0];

      c[i] = { ...c[i], room: rm.key as RoomKey, x: 20 + Math.random() * 80, y: 50 + Math.random() * 60, currentTask: task };
      pushLog(msg, c[i].emoji, c[i].body, c[i].name);
      return c;
    });
  }, [tick, projects, pushLog]);

  return { agentState, tick, isMeetingActive };
}
