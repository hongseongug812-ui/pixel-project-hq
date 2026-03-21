import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { pickRoom, detectCrisisProject, CRISIS_NEGLECT_DAYS, CRISIS_PENDING_TASKS } from "./agentRoom";
import { makeProject } from "../test/fixtures";
import type { AgentState } from "../types";

const makeAgent = (rank: AgentState["rank"]): Pick<AgentState, "rank"> => ({ rank });

describe("pickRoom — task keyword routing", () => {
  const agent = makeAgent("Junior");

  it("서버 키워드 → server room", () => {
    expect(pickRoom(agent, "서버 헬스체크 ✓")).toBe("server");
    expect(pickRoom(agent, "배포 파이프라인 확인")).toBe("server");
    expect(pickRoom(agent, "서버 장애 복구 중")).toBe("server");
    expect(pickRoom(agent, "ping 응답 정상")).toBe("server");
  });

  it("회의 키워드 → meeting room", () => {
    expect(pickRoom(agent, "스프린트 리뷰 참여")).toBe("meeting");
    expect(pickRoom(agent, "팀 미팅 — 우선순위 재조정")).toBe("meeting");
    expect(pickRoom(agent, "진행상황 보고")).toBe("meeting");
  });

  it("휴식 키워드 → lounge room", () => {
    expect(pickRoom(agent, "커피 브레이크 ☕")).toBe("lounge");
    expect(pickRoom(agent, "점심 휴식 중 🍱")).toBe("lounge");
    expect(pickRoom(agent, "팀원과 잡담 중")).toBe("lounge");
  });

  it("문서/백업 키워드 → storage room", () => {
    expect(pickRoom(agent, "문서 자동 갱신")).toBe("storage");
    expect(pickRoom(agent, "데이터베이스 백업 완료")).toBe("storage");
    expect(pickRoom(agent, "에러 로그 분석")).toBe("storage");
    expect(pickRoom(agent, "테스트 실행 중...")).toBe("storage");
  });
});

describe("pickRoom — rank-based routing (deterministic stub)", () => {
  it("CEO always goes to ceo room", () => {
    // 100번 호출해도 항상 ceo
    for (let i = 0; i < 20; i++) {
      expect(pickRoom(makeAgent("CEO"), "성능 프로파일링")).toBe("ceo");
    }
  });

  it("CTO goes to ceo or office (never other rooms) for generic task", () => {
    // "성능 프로파일링" — 키워드 없음
    const rooms = new Set(Array.from({ length: 50 }, () => pickRoom(makeAgent("CTO"), "성능 프로파일링")));
    expect([...rooms].every(r => r === "ceo" || r === "office")).toBe(true);
  });

  it("Lead goes to meeting or office for generic task", () => {
    const rooms = new Set(Array.from({ length: 50 }, () => pickRoom(makeAgent("Lead"), "성능 프로파일링")));
    expect([...rooms].every(r => r === "meeting" || r === "office")).toBe(true);
  });

  it("Senior goes to office or lab for generic task", () => {
    const rooms = new Set(Array.from({ length: 50 }, () => pickRoom(makeAgent("Senior"), "성능 프로파일링")));
    expect([...rooms].every(r => r === "office" || r === "lab")).toBe(true);
  });

  it("assignedRoom is used as fallback only for unknown rank", () => {
    // assignedRoom 체크는 rank 분기 이후 → 알려진 rank는 항상 rank 분기에서 return
    // unknown rank만 assignedRoom 경로에 도달
    vi.spyOn(Math, "random").mockReturnValue(0); // < ASSIGNED_ROOM_PROB(0.8)
    const result = pickRoom({ rank: "Unknown" as AgentState["rank"] }, "성능 프로파일링", "ceo");
    expect(result).toBe("ceo");
    vi.restoreAllMocks();
  });
});

describe("detectCrisisProject", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2024-01-20T12:00:00Z"));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("returns false for empty project list", () => {
    expect(detectCrisisProject([])).toBe(false);
  });

  it("returns false when no high priority projects", () => {
    const project = makeProject({ priority: "medium", status: "active", lastActivity: "2024-01-01" });
    expect(detectCrisisProject([project])).toBe(false);
  });

  it("returns false for completed high priority project", () => {
    const project = makeProject({ priority: "high", status: "complete", lastActivity: "2024-01-01" });
    expect(detectCrisisProject([project])).toBe(false);
  });

  it(`returns true for high priority project neglected >= ${CRISIS_NEGLECT_DAYS} days`, () => {
    // 20 - 14 = 6 days neglected (> 5)
    const project = makeProject({ priority: "high", status: "active", lastActivity: "2024-01-14" });
    expect(detectCrisisProject([project])).toBe(true);
  });

  it(`returns false for high priority project neglected < ${CRISIS_NEGLECT_DAYS} days`, () => {
    // 20 - 18 = 2 days (< 5)
    const project = makeProject({ priority: "high", status: "active", lastActivity: "2024-01-18" });
    expect(detectCrisisProject([project])).toBe(false);
  });

  it(`returns true when pending tasks >= ${CRISIS_PENDING_TASKS}`, () => {
    const tasks = Array.from({ length: CRISIS_PENDING_TASKS }, (_, i) => ({
      id: `t${i}`, text: "todo", done: false,
    }));
    const project = makeProject({ priority: "high", status: "active", lastActivity: "2024-01-19", tasks });
    expect(detectCrisisProject([project])).toBe(true);
  });

  it("returns false when pending tasks < threshold but activity is recent", () => {
    const tasks = Array.from({ length: CRISIS_PENDING_TASKS - 1 }, (_, i) => ({
      id: `t${i}`, text: "todo", done: false,
    }));
    const project = makeProject({ priority: "high", status: "active", lastActivity: "2024-01-19", tasks });
    expect(detectCrisisProject([project])).toBe(false);
  });
});
