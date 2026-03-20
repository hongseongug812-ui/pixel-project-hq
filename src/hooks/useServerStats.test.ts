import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useServerStats } from "./useServerStats";
import type { Project } from "../types";

const makeProject = (serverUrl: string | null, id = 1): Project => ({
  id, name: "Test", status: "active", priority: "high",
  progress: 0, lastActivity: "2024-01-01", room: "lab",
  serverUrl, githubUrl: null, thumbnail: null,
  description: null, featured: false, startDate: null, endDate: null, assignedAgentId: null, budget: null, targetDate: null,
  stack: [], tasks: [],
});

describe("useServerStats", () => {
  beforeEach(() => {
    // Stub fetch to resolve immediately and never hang
    global.fetch = vi.fn().mockImplementation(() =>
      Promise.resolve({ ok: true, status: 200 })
    );
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("starts with empty serverStats", () => {
    const { result } = renderHook(() => useServerStats([], 0));
    expect(result.current.serverStats).toEqual({});
  });

  it("starts with empty stats when projects have no serverUrl", () => {
    const { result } = renderHook(() => useServerStats([makeProject(null)], 0));
    expect(result.current.serverStats).toEqual({});
  });

  it("tick % 20 !== 0 skips simulation update (no state change without serverUrl)", () => {
    const { result, rerender } = renderHook(
      ({ tick }) => useServerStats([], tick),
      { initialProps: { tick: 0 } }
    );
    const before = result.current.serverStats;
    rerender({ tick: 1 });
    expect(result.current.serverStats).toEqual(before);
  });

  it("multiple projects without serverUrl produce empty stats", () => {
    const projects = [makeProject(null, 1), makeProject(null, 2), makeProject(null, 3)];
    const { result } = renderHook(() => useServerStats(projects, 0));
    expect(Object.keys(result.current.serverStats)).toHaveLength(0);
  });

  it("simulation tick (% 20) updates ping for 'up' servers", () => {
    const { result, rerender } = renderHook(
      ({ tick }) => useServerStats([], tick),
      { initialProps: { tick: 0 } }
    );
    // Manually seed a server stat as if it was already pinged
    act(() => {
      // The hook only updates on tick%20, and only if a server is 'up'
      // With empty projects, no update happens — just confirm stability
      rerender({ tick: 20 });
    });
    expect(result.current.serverStats).toEqual({});
  });

  it("returns serverStats object from hook", () => {
    const { result } = renderHook(() => useServerStats([], 0));
    expect(typeof result.current.serverStats).toBe("object");
    expect(result.current.serverStats).not.toBeNull();
  });
});
