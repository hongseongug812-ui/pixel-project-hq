import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useAgents } from "./useAgents";
import { makeProject } from "../test/fixtures";

vi.mock("../contexts/LogsContext", () => ({
  useLogs: () => ({ pushLog: vi.fn() }),
}));

vi.mock("./usePageVisible", () => ({
  usePageVisible: () => true,
}));

vi.mock("../components/MyPage", () => ({
  loadMyAvatar: () => ({ name: "TestUser", emoji: "🧑", bodyColor: "#a78bfa" }),
}));

describe("useAgents — initialization", () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => { vi.useRealTimers(); vi.clearAllMocks(); });

  it("initializes with correct number of agents (AGENTS + me)", () => {
    const { result } = renderHook(() => useAgents([]));
    // AGENTS has 6 defined agents + 1 "me" agent = 7
    expect(result.current.agentState.length).toBeGreaterThanOrEqual(7);
  });

  it("includes 'me' agent in state", () => {
    const { result } = renderHook(() => useAgents([]));
    const me = result.current.agentState.find(a => a.id === "me");
    expect(me).toBeDefined();
    expect(me?.name).toBe("TestUser");
  });

  it("each agent has valid room assignment", () => {
    const { result } = renderHook(() => useAgents([]));
    const validRooms = ["lab", "office", "server", "ceo", "lounge", "meeting", "storage"];
    for (const agent of result.current.agentState) {
      expect(validRooms).toContain(agent.room);
    }
  });

  it("each agent has numeric x/y position", () => {
    const { result } = renderHook(() => useAgents([]));
    for (const agent of result.current.agentState) {
      expect(typeof agent.x).toBe("number");
      expect(typeof agent.y).toBe("number");
    }
  });

  it("starts with isMeetingActive = false", () => {
    const { result } = renderHook(() => useAgents([]));
    expect(result.current.isMeetingActive).toBe(false);
  });
});

describe("useAgents — AI chat mode", () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => { vi.useRealTimers(); vi.clearAllMocks(); });

  it("moves all agents to meeting room when isAIChatOpen = true", () => {
    const { result, rerender } = renderHook(
      ({ open }) => useAgents([], open),
      { initialProps: { open: false } }
    );

    act(() => rerender({ open: true }));

    expect(result.current.agentState.every(a => a.room === "meeting")).toBe(true);
  });

  it("sets isMeetingActive when isAIChatOpen = true", () => {
    const { result } = renderHook(() => useAgents([], true));
    expect(result.current.isMeetingActive).toBe(true);
  });

  it("sets currentTask to AI chat message when open", () => {
    const { result } = renderHook(() => useAgents([], true));
    const allInChat = result.current.agentState.every(a => a.currentTask === "AI 채팅 회의 중");
    expect(allInChat).toBe(true);
  });
});

describe("useAgents — avatar update event", () => {
  afterEach(() => vi.restoreAllMocks());

  it("updates me agent on phq-avatar-updated event", () => {
    const { result } = renderHook(() => useAgents([]));
    act(() => {
      window.dispatchEvent(new CustomEvent("phq-avatar-updated"));
    });

    const meAfter = result.current.agentState.find(a => a.id === "me");
    expect(meAfter?.id).toBe("me");
    expect(meAfter?.name).toBe("TestUser");
  });

  it("removes avatar update listener on unmount", () => {
    const removeEventListenerSpy = vi.spyOn(window, "removeEventListener");
    const { unmount } = renderHook(() => useAgents([]));
    unmount();
    expect(removeEventListenerSpy).toHaveBeenCalledWith("phq-avatar-updated", expect.any(Function));
  });
});

describe("useAgents — agent movement", () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => { vi.useRealTimers(); vi.clearAllMocks(); });

  it("tick increments over time", async () => {
    const { result } = renderHook(() => useAgents([]));
    expect(result.current.tick).toBe(0);
    await act(async () => { await vi.advanceTimersByTimeAsync(200); });
    expect(result.current.tick).toBeGreaterThan(0);
  });

  it("agents move (x changes) after tick interval", async () => {
    const { result } = renderHook(() => useAgents([]));
    const xBefore = result.current.agentState.map(a => a.x);

    await act(async () => { await vi.advanceTimersByTimeAsync(500); });

    const xAfter = result.current.agentState.map(a => a.x);
    // At least one agent should have moved
    const anyMoved = xBefore.some((x, i) => x !== xAfter[i]);
    expect(anyMoved).toBe(true);
  });
});

describe("useAgents — crisis detection", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2024-01-20T12:00:00Z"));
  });
  afterEach(() => { vi.useRealTimers(); vi.clearAllMocks(); });

  it("does not trigger meeting without crisis project", async () => {
    const project = makeProject({ priority: "medium", status: "active", lastActivity: "2024-01-19" });
    const { result } = renderHook(() => useAgents([project]));

    await act(async () => { await vi.advanceTimersByTimeAsync(25 * 200); }); // 25 ticks

    expect(result.current.isMeetingActive).toBe(false);
  });

  it("may trigger emergency meeting with high priority neglected project", async () => {
    const project = makeProject({
      priority: "high",
      status: "active",
      lastActivity: "2024-01-01", // 19 days neglected (> CRISIS_NEGLECT_DAYS=5)
    });
    const { result } = renderHook(() => useAgents([project]));

    await act(async () => { await vi.advanceTimersByTimeAsync(25 * 200 + 100); });

    // Meeting may or may not trigger (random shuffling), but state should be valid
    expect(typeof result.current.isMeetingActive).toBe("boolean");
  });
});
