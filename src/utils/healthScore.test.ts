import { describe, it, expect, vi, beforeEach } from "vitest";
import { calcHealthScore, healthColor, healthLabel } from "./healthScore";
import type { Project } from "../types";
import type { ServerStatsMap } from "../types";

const base: Project = {
  id: 1, name: "Test", status: "active", priority: "medium",
  progress: 50, lastActivity: "2024-01-09", room: "lab",
  serverUrl: null, githubUrl: null, thumbnail: null,
  description: null, featured: false, startDate: null, endDate: null,
  assignedAgentId: null, budget: null, targetDate: null,
  stack: [], tasks: [],
};

const noStats: ServerStatsMap = {};

describe("calcHealthScore", () => {
  beforeEach(() => {
    vi.setSystemTime(new Date("2024-01-10T12:00:00Z"));
  });

  it("returns 100 for completed project", () => {
    expect(calcHealthScore({ ...base, status: "complete" }, noStats)).toBe(100);
  });

  it("returns 30 for paused project", () => {
    expect(calcHealthScore({ ...base, status: "paused" }, noStats)).toBe(30);
  });

  it("calculates score for active project with no server", () => {
    const score = calcHealthScore({ ...base, progress: 50, lastActivity: "2024-01-09" }, noStats);
    // progressScore=20, activityScore=25 (1 day), taskScore=10 (no tasks → neutral), serverScore=10
    expect(score).toBe(65);
  });

  it("penalises projects with no recent activity (7+ days)", () => {
    const neglected = { ...base, progress: 50, lastActivity: "2024-01-01" }; // 9 days ago
    const score = calcHealthScore(neglected, noStats);
    // activityScore = 0 (>7 days)
    expect(score).toBeLessThan(50);
  });

  it("adds full task completion bonus", () => {
    const proj: Project = {
      ...base,
      progress: 0,
      lastActivity: "2024-01-09",
      tasks: [
        { id: "t1", text: "a", done: true },
        { id: "t2", text: "b", done: true },
      ],
    };
    const score = calcHealthScore(proj, noStats);
    // taskScore = 20 (100% done)
    expect(score).toBeGreaterThan(50);
  });

  it("penalises when server is down", () => {
    const stats: ServerStatsMap = { "https://myapp.com": { status: "down", ping: 0, uptime: 0 } };
    const proj = { ...base, serverUrl: "https://myapp.com" };
    const scoreDown = calcHealthScore(proj, stats);
    const scoreUp = calcHealthScore(proj, noStats); // no stats = 5 pts (unknown)
    expect(scoreDown).toBeLessThan(scoreUp);
  });

  it("caps score at 100", () => {
    const proj: Project = {
      ...base,
      progress: 100,
      lastActivity: "2024-01-10", // today
      tasks: [{ id: "t1", text: "a", done: true }],
    };
    expect(calcHealthScore(proj, noStats)).toBeLessThanOrEqual(100);
  });
});

describe("healthColor", () => {
  it("returns green for >=75", () => {
    expect(healthColor(75)).toBe("#4ade80");
    expect(healthColor(100)).toBe("#4ade80");
  });

  it("returns yellow for 50–74", () => {
    expect(healthColor(50)).toBe("#facc15");
    expect(healthColor(74)).toBe("#facc15");
  });

  it("returns orange for 25–49", () => {
    expect(healthColor(25)).toBe("#f97316");
  });

  it("returns red for <25", () => {
    expect(healthColor(0)).toBe("#ef4444");
    expect(healthColor(24)).toBe("#ef4444");
  });
});

describe("healthLabel", () => {
  it("HEALTHY for score >=75", () => expect(healthLabel(80)).toBe("HEALTHY"));
  it("OK for score 50–74",     () => expect(healthLabel(60)).toBe("OK"));
  it("WARN for score 25–49",   () => expect(healthLabel(30)).toBe("WARN"));
  it("CRITICAL for score <25", () => expect(healthLabel(10)).toBe("CRITICAL"));
});
