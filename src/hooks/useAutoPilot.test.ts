import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { renderHook } from "@testing-library/react";
import { useAutoPilot } from "./useAutoPilot";
import { makeProject } from "../test/fixtures";
import type { Project, ServerStatsMap } from "../types";

vi.mock("../contexts/LogsContext", () => ({
  useLogs: () => ({ pushLog: vi.fn() }),
}));

describe("useAutoPilot — server monitoring", () => {
  let updateProject: (id: number | string, fields: Partial<Project>) => void;
  let addTask: (pid: number | string, text: string) => void;

  beforeEach(() => {
    vi.useFakeTimers();
    updateProject = vi.fn();
    addTask = vi.fn();
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.clearAllMocks();
  });

  it("pauses active project when server is down", async () => {
    const project = makeProject({ serverUrl: "https://myapp.com" });
    const stats: ServerStatsMap = {
      "https://myapp.com": { status: "down", ping: 0, uptime: 0 },
    };

    renderHook(() => useAutoPilot([project], stats, updateProject, addTask));

    // 초기 3초 딜레이 후 실행
    await vi.advanceTimersByTimeAsync(3100);

    expect(updateProject).toHaveBeenCalledWith(1, { status: "paused" });
    expect(addTask).toHaveBeenCalledWith(1, expect.stringContaining("서버 장애"));
  });

  it("does not pause if server is up", async () => {
    const project = makeProject({ serverUrl: "https://myapp.com" });
    const stats: ServerStatsMap = {
      "https://myapp.com": { status: "up", ping: 120, uptime: 99 },
    };

    renderHook(() => useAutoPilot([project], stats, updateProject, addTask));
    await vi.advanceTimersByTimeAsync(3100);

    expect(updateProject).not.toHaveBeenCalled();
  });

  it("does not pause project with no serverUrl", async () => {
    const project = makeProject({ serverUrl: null });
    const stats: ServerStatsMap = {};

    renderHook(() => useAutoPilot([project], stats, updateProject, addTask));
    await vi.advanceTimersByTimeAsync(3100);

    expect(updateProject).not.toHaveBeenCalled();
  });
});

describe("useAutoPilot — dispatch events", () => {
  let updateProject: (id: number | string, fields: Partial<Project>) => void;
  let addTask: (pid: number | string, text: string) => void;
  let dispatchedEvents: CustomEvent[];

  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2024-01-20T12:00:00Z"));
    updateProject = vi.fn();
    addTask = vi.fn();
    dispatchedEvents = [];
    vi.spyOn(window, "dispatchEvent").mockImplementation((e) => {
      if (e instanceof CustomEvent) dispatchedEvents.push(e);
      return true;
    });
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it("dispatches phq-feed event with ops channel when server goes down", async () => {
    const project = makeProject({ serverUrl: "https://myapp.com" });
    const stats: ServerStatsMap = {
      "https://myapp.com": { status: "down", ping: 0, uptime: 0 },
    };

    renderHook(() => useAutoPilot([project], stats, updateProject, addTask));
    await vi.advanceTimersByTimeAsync(3100);

    const feedEvent = dispatchedEvents.find(e => e.type === "phq-feed");
    expect(feedEvent).toBeDefined();
    expect(feedEvent?.detail.channel).toBe("ops");
    expect(feedEvent?.detail.content).toContain("서버 장애");
  });

  it("dispatches phq-feed with general channel for neglected project", async () => {
    const project = makeProject({
      id: 10,
      priority: "medium",
      status: "active",
      lastActivity: "2024-01-10", // 10 days ago
    });

    renderHook(() => useAutoPilot([project], {}, updateProject, addTask));
    await vi.advanceTimersByTimeAsync(5100);

    const feedEvent = dispatchedEvents.find(e => e.type === "phq-feed" && e.detail.channel === "general");
    expect(feedEvent).toBeDefined();
    expect(feedEvent?.detail.content).toContain("업데이트 없음");
  });

  it("dispatches phq-feed with announcements channel for deadline", async () => {
    const project = makeProject({
      id: 11,
      priority: "medium",
      status: "active",
      targetDate: "2024-01-25",
    });

    renderHook(() => useAutoPilot([project], {}, updateProject, addTask));
    await vi.advanceTimersByTimeAsync(5100);

    const feedEvent = dispatchedEvents.find(e => e.type === "phq-feed" && e.detail.channel === "announcements");
    expect(feedEvent).toBeDefined();
    expect(feedEvent?.detail.content).toContain("마감");
  });
});

describe("useAutoPilot — project management", () => {
  let updateProject: (id: number | string, fields: Partial<Project>) => void;
  let addTask: (pid: number | string, text: string) => void;

  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2024-01-20T12:00:00Z"));
    updateProject = vi.fn();
    addTask = vi.fn();
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.clearAllMocks();
  });

  it("escalates neglected non-high project to high priority after 7+ days", async () => {
    const project = makeProject({
      id: 2,
      priority: "medium",
      status: "active",
      lastActivity: "2024-01-10", // 10 days ago
    });

    renderHook(() => useAutoPilot([project], {}, updateProject, addTask));
    await vi.advanceTimersByTimeAsync(5100); // 5s initial delay

    expect(updateProject).toHaveBeenCalledWith(2, { priority: "high" });
    expect(addTask).toHaveBeenCalledWith(2, expect.stringContaining("방치"));
  });

  it("skips already high priority projects for neglect escalation", async () => {
    const project = makeProject({
      id: 3,
      priority: "high",
      status: "active",
      lastActivity: "2024-01-01", // 19 days ago
    });

    renderHook(() => useAutoPilot([project], {}, updateProject, addTask));
    await vi.advanceTimersByTimeAsync(5100);

    // Should not call updateProject for neglect (already high)
    const neglectCalls = (updateProject as ReturnType<typeof vi.fn>).mock.calls.filter(
      (call: unknown[]) => (call[1] as Record<string, unknown>)?.priority === "high"
    );
    expect(neglectCalls).toHaveLength(0);
  });

  it("escalates deadline-approaching project", async () => {
    const project = makeProject({
      id: 4,
      priority: "medium",
      status: "active",
      targetDate: "2024-01-25", // 5 days away
    });

    renderHook(() => useAutoPilot([project], {}, updateProject, addTask));
    await vi.advanceTimersByTimeAsync(5100);

    expect(updateProject).toHaveBeenCalledWith(4, { priority: "high" });
  });

  it("does not escalate completed projects", async () => {
    const project = makeProject({
      id: 5,
      priority: "medium",
      status: "complete",
      lastActivity: "2024-01-01",
    });

    renderHook(() => useAutoPilot([project], {}, updateProject, addTask));
    await vi.advanceTimersByTimeAsync(5100);

    expect(updateProject).not.toHaveBeenCalled();
  });
});
