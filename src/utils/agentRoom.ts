/**
 * 에이전트 방 배정 및 위기 감지 유틸리티.
 * useAgents에서 분리해 독립적으로 테스트 가능하도록 구성.
 */
import { daysSince } from "./helpers";
import type { AgentState, Project, RoomKey } from "../types";

// rank별 방 결정 확률
const CTO_CEO_ROOM_PROB   = 0.6;
const LEAD_MEETING_PROB   = 0.5;
const SENIOR_OFFICE_PROB  = 0.7;
const JUNIOR_LAB_PROB     = 0.5;
const JUNIOR_OFFICE_PROB  = 0.75; // lab 이외 누적 확률
const ASST_OFFICE_PROB    = 0.4;
const ASST_LOUNGE_PROB    = 0.65; // office 이외 누적 확률
const ASSIGNED_ROOM_PROB  = 0.8;  // 담당 프로젝트 방으로 이동할 확률

export const CRISIS_NEGLECT_DAYS  = 5; // 위기 판단 방치 기준 (일)
export const CRISIS_PENDING_TASKS = 5; // 위기 판단 미완료 태스크 기준 (개)

const ALL_ROOMS: RoomKey[] = ["lab", "office", "server", "ceo", "lounge", "meeting", "storage"];

/** task 내용과 계급을 기반으로 에이전트가 이동할 방을 결정한다. */
export function pickRoom(agent: Pick<AgentState, "rank">, task: string, assignedRoom?: RoomKey): RoomKey {
  const t = task.toLowerCase();

  if (/서버|배포|헬스체크|응답|장애|복구|ping|uptime/.test(t)) return "server";
  if (/회의|보고|검토|리뷰|스프린트|미팅/.test(t))             return "meeting";
  if (/커피|휴식|점심|잡담/.test(t))                           return "lounge";
  if (/문서|백업|로그|테스트/.test(t))                         return "storage";

  if (agent.rank === "CEO") return "ceo";
  if (agent.rank === "CTO") return Math.random() < CTO_CEO_ROOM_PROB ? "ceo" : "office";
  if (agent.rank === "Lead") return Math.random() < LEAD_MEETING_PROB ? "meeting" : "office";
  if (agent.rank === "Senior") return Math.random() < SENIOR_OFFICE_PROB ? "office" : "lab";
  if (agent.rank === "Junior") {
    const r = Math.random();
    return r < JUNIOR_LAB_PROB ? "lab" : r < JUNIOR_OFFICE_PROB ? "office" : "lounge";
  }
  if (agent.rank === "Assistant") {
    const r = Math.random();
    return r < ASST_OFFICE_PROB ? "office" : r < ASST_LOUNGE_PROB ? "lounge" : "lab";
  }

  if (assignedRoom && Math.random() < ASSIGNED_ROOM_PROB) return assignedRoom;

  return ALL_ROOMS[Math.floor(Math.random() * ALL_ROOMS.length)];
}

/** 위기 프로젝트(긴급 회의 트리거 기준) 존재 여부를 반환한다. */
export function detectCrisisProject(projects: Project[]): boolean {
  return projects.some(p =>
    p.priority === "high" &&
    p.status !== "complete" &&
    (daysSince(p.lastActivity) >= CRISIS_NEGLECT_DAYS ||
     p.tasks.filter(t => !t.done).length >= CRISIS_PENDING_TASKS)
  );
}
