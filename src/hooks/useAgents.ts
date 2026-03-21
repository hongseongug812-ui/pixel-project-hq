import { useState, useEffect, useRef } from "react";
import { AGENTS, ROOMS } from "../data/constants";
import { PHQ_EVENTS } from "../data/events";
import { LOG_ACTIONS } from "../data/agentActions";
import { useLogs } from "../contexts/LogsContext";
import { loadMyAvatar } from "../components/MyPage";
import { usePageVisible } from "./usePageVisible";
import { pickRoom, detectCrisisProject } from "../utils/agentRoom";
import type { AgentState, Project, RoomKey } from "../types";

// ── 상수 ────────────────────────────────────────────────────────────────
const AGENT_TICK_MS      = 180; // 캐릭터 이동 인터벌 (ms)
const ROOM_CHANGE_EVERY  = 25;  // N 틱마다 방 이동 결정
const MEETING_TICKS      = 35;  // 긴급 회의 지속 틱 수
const MEETING_MIN_AGENTS = 2;   // 회의 최소 소집 인원
const MEETING_MAX_AGENTS = 4;   // 회의 최대 소집 인원

function makeMyAgentState(): AgentState {
  const av = loadMyAvatar();
  return {
    id: "me", name: av.name || "ME", role: "사용자", rank: "Junior",
    aiModel: "GPT-4o mini", personality: "이 회사의 주인. 모든 프로젝트를 관리한다.",
    hair: av.bodyColor, skin: av.bodyColor, shirt: av.bodyColor, pants: av.bodyColor,
    body: av.bodyColor, emoji: av.emoji, task: "오피스 순찰 중",
    room: "lounge",
    x: 20 + Math.random() * 80, y: 50 + Math.random() * 60,
    frame: 0, dx: 0.4 + Math.random() * 0.4, currentTask: "오피스 순찰 중",
  };
}

export function useAgents(projects: Project[], isAIChatOpen = false) {
  const { pushLog } = useLogs();
  const pageVisible = usePageVisible();
  const [agentState, setAgentState] = useState<AgentState[]>(() =>
    [...AGENTS.map((a, i) => ({
      ...a,
      room: ROOMS[i % ROOMS.length].key,
      x: 20 + Math.random() * 100,
      y: 50 + Math.random() * 80,
      frame: 0,
      dx: 0.3 + Math.random() * 0.5,
      currentTask: a.task,
    })), makeMyAgentState()]
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
        ...a, room: "meeting",
        x: 20 + (i % 3) * 60 + Math.random() * 20,
        y: 50 + Math.floor(i / 3) * 40 + Math.random() * 15,
        currentTask: "AI 채팅 회의 중",
      })));
      pushLog("AI 채팅 시작 — 전 에이전트 회의실 집결", "💬", "#f472b6");
    } else {
      setIsMeetingActive(false);
      setAgentState(prev => prev.map((a, i) => {
        if (a.id === "me") return { ...makeMyAgentState() };
        return {
          ...a, room: ROOMS[i % ROOMS.length].key,
          x: 20 + Math.random() * 80,
          y: 50 + Math.random() * 60,
          currentTask: AGENTS[i]?.task ?? a.task,
        };
      }));
    }
  }, [isAIChatOpen]);

  // 아바타 업데이트 이벤트 수신 → 내 캐릭터 즉시 반영
  useEffect(() => {
    function onAvatarUpdate() {
      setAgentState(prev => prev.map(a => a.id === "me" ? { ...a, ...makeMyAgentState(), room: a.room, x: a.x, y: a.y } : a));
    }
    window.addEventListener(PHQ_EVENTS.AVATAR_UPDATED, onAvatarUpdate);
    return () => window.removeEventListener(PHQ_EVENTS.AVATAR_UPDATED, onAvatarUpdate);
  }, []);

  // 캐릭터 이동 — 탭 숨김 시 중단, 변경된 에이전트만 새 객체 생성
  useEffect(() => {
    if (!pageVisible) return;
    const iv = setInterval(() => {
      setTick(t => t + 1);
      setAgentState(prev => {
        let changed = false;
        const next = prev.map(a => {
          const rm = ROOMS.find(r => r.key === a.room);
          const maxX = rm ? rm.w - 30 : 160;
          let nx = a.x + a.dx, nd = a.dx;
          if (nx > maxX || nx < 15) { nd = -nd; nx = a.x + nd; }
          if (nx === a.x && nd === a.dx) return a; // 변화 없으면 동일 참조 유지
          changed = true;
          return { ...a, x: nx, dx: nd, frame: a.frame + 1 };
        });
        return changed ? next : prev; // 아무것도 안 바뀌면 리렌더 방지
      });
    }, AGENT_TICK_MS);
    return () => clearInterval(iv);
  }, [pageVisible]);

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
        return { ...a, room: returnRoom.key, x: 20 + Math.random() * 80, y: 50 + Math.random() * 60, currentTask: AGENTS.find(ag => ag.id === a.id)?.task ?? a.task };
      }));
      pushLog("긴급 회의 종료 — 액션 플랜 수립됨", "✅", "#4ade80");
    }
  }, [tick]);

  // N틱마다: 방 이동 + 위기 감지 → 회의 소집
  useEffect(() => {
    if (tick % ROOM_CHANGE_EVERY !== 0 || tick === 0) return;

    // 담당 프로젝트 → 방 맵 빌드
    const assignedRoomMap = new Map<string, RoomKey>();
    projects.forEach(p => {
      if (p.assignedAgentId) assignedRoomMap.set(p.assignedAgentId, p.room);
    });

    // 위기 감지 → 회의 소집
    if (detectCrisisProject(projects) && !meetingRef.current.active) {
      const shuffledIds = [...agentState].sort(() => Math.random() - 0.5).slice(0, MEETING_MIN_AGENTS + Math.floor(Math.random() * (MEETING_MAX_AGENTS - MEETING_MIN_AGENTS))).map(a => a.id);
      meetingRef.current = { active: true, ticksLeft: MEETING_TICKS, agentIds: shuffledIds };
      setIsMeetingActive(true);
      setAgentState(prev => prev.map(a =>
        shuffledIds.includes(a.id)
          ? { ...a, room: "meeting", x: 30 + Math.random() * 60, y: 50 + Math.random() * 50, currentTask: "긴급 회의 중" }
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

      c[i] = { ...c[i], room: rm.key, x: 20 + Math.random() * 80, y: 50 + Math.random() * 60, currentTask: task };
      pushLog(msg, c[i].emoji, c[i].body, c[i].name);
      return c;
    });
  }, [tick, projects, pushLog]);

  return { agentState, tick, isMeetingActive };
}
