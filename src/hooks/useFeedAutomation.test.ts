import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { renderHook } from "@testing-library/react";
import { useFeedAutomation } from "./useFeedAutomation";
import { makeProject } from "../test/fixtures";
import type { FeedMessage } from "./useCompanyFeed";

vi.mock("./usePageVisible", () => ({
  usePageVisible: () => true,
}));

vi.mock("../utils/discord", () => ({
  sendDiscord: vi.fn().mockResolvedValue(true),
}));

vi.mock("../components/MyPage", () => ({
  loadUserSettings: () => ({ discordWebhook: "" }),
}));

// Real agent IDs from src/data/constants.ts
const AGENT_IDS = { CEO: "a1", CTO: "a2", LEAD: "a3", SENIOR: "a4", JUNIOR: "a5" };

function makeCallbacks() {
  const addMessage = vi.fn((msg: Omit<FeedMessage, "id" | "timestamp">): FeedMessage => ({
    ...msg, id: `test_${Date.now()}`, timestamp: Date.now(),
  }));
  const postMessage = vi.fn((msg: Omit<FeedMessage, "id" | "timestamp">): FeedMessage => ({
    ...msg, id: `test_${Date.now()}`, timestamp: Date.now(),
  }));
  return { addMessage, postMessage };
}

describe("useFeedAutomation — AutoPilot event listener", () => {
  afterEach(() => vi.restoreAllMocks());

  it("calls addMessage with correct content when phq-feed event fires with valid agentId", () => {
    const { addMessage, postMessage } = makeCallbacks();
    renderHook(() => useFeedAutomation([makeProject()], addMessage, postMessage));

    window.dispatchEvent(new CustomEvent("phq-feed", {
      detail: { agentId: AGENT_IDS.CTO, content: "서버 점검 중", channel: "ops" },
    }));

    expect(addMessage).toHaveBeenCalledTimes(1);
    const msg = addMessage.mock.calls[0][0];
    expect(msg.content).toBe("서버 점검 중");
    expect(msg.channel).toBe("ops");
    expect(msg.type).toBe("alert");
    expect(msg.agentId).toBe(AGENT_IDS.CTO);
  });

  it("ignores phq-feed events with unknown agentId", () => {
    const { addMessage, postMessage } = makeCallbacks();
    renderHook(() => useFeedAutomation([makeProject()], addMessage, postMessage));

    window.dispatchEvent(new CustomEvent("phq-feed", {
      detail: { agentId: "nonexistent-agent-xyz", content: "test", channel: "general" },
    }));

    expect(addMessage).not.toHaveBeenCalled();
  });

  it("removes phq-feed event listener on unmount", () => {
    const { addMessage, postMessage } = makeCallbacks();
    const { unmount } = renderHook(() =>
      useFeedAutomation([makeProject()], addMessage, postMessage)
    );

    unmount();
    addMessage.mockClear();

    window.dispatchEvent(new CustomEvent("phq-feed", {
      detail: { agentId: AGENT_IDS.CTO, content: "after unmount", channel: "ops" },
    }));

    expect(addMessage).not.toHaveBeenCalled();
  });

  it("defaults to 'general' channel when channel is missing from event detail", () => {
    const { addMessage, postMessage } = makeCallbacks();
    renderHook(() => useFeedAutomation([makeProject()], addMessage, postMessage));

    window.dispatchEvent(new CustomEvent("phq-feed", {
      detail: { agentId: AGENT_IDS.SENIOR, content: "no channel here" },
    }));

    expect(addMessage).toHaveBeenCalledTimes(1);
    expect(addMessage.mock.calls[0][0].channel).toBe("general");
  });
});

describe("useFeedAutomation — task completion detection", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2024-01-20T12:00:00Z"));
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.clearAllMocks();
  });

  it("calls addMessage when assigned agent's task is completed", () => {
    const { addMessage, postMessage } = makeCallbacks();
    const projectBefore = makeProject({
      id: 1,
      assignedAgentId: AGENT_IDS.SENIOR,
      tasks: [{ id: "t1", text: "write tests", done: false }],
    });

    const { rerender } = renderHook(
      ({ projects }) => useFeedAutomation(projects, addMessage, postMessage),
      { initialProps: { projects: [projectBefore] } }
    );

    addMessage.mockClear();

    const projectAfter = makeProject({
      id: 1,
      assignedAgentId: AGENT_IDS.SENIOR,
      tasks: [{ id: "t1", text: "write tests", done: true }],
    });

    rerender({ projects: [projectAfter] });

    expect(addMessage).toHaveBeenCalledTimes(1);
    const msg = addMessage.mock.calls[0][0];
    expect(msg.channel).toBe("dev");
    expect(msg.content).toContain("Test Project");
  });

  it("calls addMessage when progress increases by 10+", () => {
    const { addMessage, postMessage } = makeCallbacks();

    const { rerender } = renderHook(
      ({ projects }) => useFeedAutomation(projects, addMessage, postMessage),
      { initialProps: { projects: [makeProject({ id: 1, progress: 30, assignedAgentId: AGENT_IDS.CTO })] } }
    );

    addMessage.mockClear();

    // 9 증가 → 미발동
    rerender({ projects: [makeProject({ id: 1, progress: 39, assignedAgentId: AGENT_IDS.CTO })] });
    expect(addMessage).not.toHaveBeenCalled();

    addMessage.mockClear();

    // 10 이상 증가 → 발동
    rerender({ projects: [makeProject({ id: 1, progress: 50, assignedAgentId: AGENT_IDS.CTO })] });
    expect(addMessage).toHaveBeenCalledTimes(1);
    expect(addMessage.mock.calls[0][0].channel).toBe("dev");
  });

  it("does not call addMessage when no assigned agent", () => {
    const { addMessage, postMessage } = makeCallbacks();
    const projectBefore = makeProject({
      id: 1,
      assignedAgentId: null,
      tasks: [{ id: "t1", text: "task", done: false }],
    });

    const { rerender } = renderHook(
      ({ projects }) => useFeedAutomation(projects, addMessage, postMessage),
      { initialProps: { projects: [projectBefore] } }
    );
    addMessage.mockClear();

    rerender({ projects: [makeProject({ id: 1, assignedAgentId: null, tasks: [{ id: "t1", text: "task", done: true }] })] });

    expect(addMessage).not.toHaveBeenCalled();
  });
});

describe("useFeedAutomation — CEO announcement", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    localStorage.clear();
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.clearAllMocks();
    localStorage.clear();
  });

  it("does not announce when projects array is empty", async () => {
    const { addMessage, postMessage } = makeCallbacks();
    renderHook(() => useFeedAutomation([], addMessage, postMessage));
    await vi.advanceTimersByTimeAsync(5000);
    expect(postMessage).not.toHaveBeenCalled();
  });

  it("skips announcement if already announced today", async () => {
    const todayKey = `phq_ceo_announced_${new Date().toDateString()}`;
    localStorage.setItem(todayKey, "1");

    const { addMessage, postMessage } = makeCallbacks();
    renderHook(() => useFeedAutomation([makeProject()], addMessage, postMessage));
    await vi.advanceTimersByTimeAsync(5000);
    expect(postMessage).not.toHaveBeenCalled();
  });

  it("fires CEO announcement after 3s with correct channel and type", async () => {
    const { addMessage, postMessage } = makeCallbacks();
    renderHook(() => useFeedAutomation([makeProject()], addMessage, postMessage));
    await vi.advanceTimersByTimeAsync(3100);

    expect(postMessage).toHaveBeenCalledTimes(1);
    const call = postMessage.mock.calls[0][0];
    expect(call.channel).toBe("announcements");
    expect(call.type).toBe("announcement");
    expect(call.agentId).toBe(AGENT_IDS.CEO);
    expect(call.content).toMatch(/프로젝트/);
  });

  it("marks announcement as done in localStorage", async () => {
    const { addMessage, postMessage } = makeCallbacks();
    renderHook(() => useFeedAutomation([makeProject()], addMessage, postMessage));
    await vi.advanceTimersByTimeAsync(3100);

    const todayKey = `phq_ceo_announced_${new Date().toDateString()}`;
    expect(localStorage.getItem(todayKey)).toBe("1");
  });

  it("does not announce twice when re-rendered with same project count", async () => {
    const { addMessage, postMessage } = makeCallbacks();
    const p = makeProject();
    const { rerender } = renderHook(
      ({ projects }) => useFeedAutomation(projects, addMessage, postMessage),
      { initialProps: { projects: [p] } }
    );
    await vi.advanceTimersByTimeAsync(3100);
    expect(postMessage).toHaveBeenCalledTimes(1);

    // 같은 개수로 재렌더 — length 기반 신규 프로젝트 감지 미발동
    rerender({ projects: [makeProject({ id: 1, progress: 80 })] });
    await vi.advanceTimersByTimeAsync(3100);
    // announcedTodayRef.current === true → 두 번째 공지 없음
    expect(postMessage).toHaveBeenCalledTimes(1);
  });
});

describe("useFeedAutomation — new project detection", () => {
  afterEach(() => vi.clearAllMocks());

  it("calls postMessage when a new project is added", () => {
    const { addMessage, postMessage } = makeCallbacks();
    const { rerender } = renderHook(
      ({ projects }) => useFeedAutomation(projects, addMessage, postMessage),
      { initialProps: { projects: [makeProject({ id: 1 })] } }
    );

    postMessage.mockClear();
    rerender({ projects: [makeProject({ id: 2, name: "New App" }), makeProject({ id: 1 })] });

    expect(postMessage).toHaveBeenCalledTimes(1);
    const msg = postMessage.mock.calls[0][0];
    expect(msg.content).toContain("New App");
    expect(msg.channel).toBe("general");
  });
});
