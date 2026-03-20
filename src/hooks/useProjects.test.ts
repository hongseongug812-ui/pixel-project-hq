import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import React from "react";
import type { ReactNode } from "react";

// Mock supabase before importing the hook
vi.mock("../lib/supabase", () => ({ isConfigured: false }));
vi.mock("../lib/db", () => ({
  fetchProjects: vi.fn(),
  createProject: vi.fn(),
  deleteProject: vi.fn(),
  updateProject: vi.fn(),
}));
vi.mock("../contexts/LogsContext", () => ({
  useLogs: () => ({ pushLog: vi.fn() }),
}));

import { useProjects } from "./useProjects";
import type { Project } from "../types";

const KEY = "phq6";

const sampleProject: Project = {
  id: 1, name: "Local Project", status: "active", priority: "high",
  progress: 0, lastActivity: "2024-01-01", room: "lab",
  serverUrl: null, githubUrl: null, thumbnail: null,
  description: null, featured: false, startDate: null, endDate: null,
  stack: ["React"], tasks: [{ id: "t1", text: "작업", done: false }],
};

const wrapper = ({ children }: { children: ReactNode }) =>
  React.createElement(React.Fragment, null, children);

describe("useProjects (offline/localStorage mode)", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it("starts with empty projects and loadingData true", () => {
    const { result } = renderHook(() => useProjects(null), { wrapper });
    expect(result.current.projects).toHaveLength(0);
    expect(result.current.loadingData).toBe(true);
  });

  it("loadProjects reads from localStorage when not configured", async () => {
    localStorage.setItem(KEY, JSON.stringify([sampleProject]));
    const { result } = renderHook(() => useProjects(null), { wrapper });
    await act(async () => { await result.current.loadProjects(); });
    expect(result.current.projects).toHaveLength(1);
    expect(result.current.projects[0].name).toBe("Local Project");
    expect(result.current.loadingData).toBe(false);
  });

  it("loadProjects handles empty localStorage gracefully", async () => {
    const { result } = renderHook(() => useProjects(null), { wrapper });
    await act(async () => { await result.current.loadProjects(); });
    expect(result.current.projects).toHaveLength(0);
    expect(result.current.loadingData).toBe(false);
  });

  it("addProject prepends to projects list with new id in offline mode", async () => {
    const { result } = renderHook(() => useProjects(null), { wrapper });
    await act(async () => { await result.current.addProject(sampleProject); });
    expect(result.current.projects).toHaveLength(1);
    expect(typeof result.current.projects[0].id).toBe("number");
  });

  it("deleteProject removes project by id", async () => {
    localStorage.setItem(KEY, JSON.stringify([sampleProject]));
    const { result } = renderHook(() => useProjects(null), { wrapper });
    await act(async () => { await result.current.loadProjects(); });
    act(() => { result.current.deleteProject(1); });
    expect(result.current.projects).toHaveLength(0);
  });

  it("updateProject merges fields into existing project", async () => {
    localStorage.setItem(KEY, JSON.stringify([sampleProject]));
    const { result } = renderHook(() => useProjects(null), { wrapper });
    await act(async () => { await result.current.loadProjects(); });
    act(() => { result.current.updateProject(1, { name: "Updated" }); });
    expect(result.current.projects[0].name).toBe("Updated");
  });

  it("toggleTask flips done and updates progress", async () => {
    localStorage.setItem(KEY, JSON.stringify([sampleProject]));
    const { result } = renderHook(() => useProjects(null), { wrapper });
    await act(async () => { await result.current.loadProjects(); });
    act(() => { result.current.toggleTask(1, "t1"); });
    expect(result.current.projects[0].tasks[0].done).toBe(true);
    expect(result.current.projects[0].progress).toBe(100);
  });

  it("addTask appends a new task", async () => {
    localStorage.setItem(KEY, JSON.stringify([sampleProject]));
    const { result } = renderHook(() => useProjects(null), { wrapper });
    await act(async () => { await result.current.loadProjects(); });
    act(() => { result.current.addTask(1, "새 태스크"); });
    expect(result.current.projects[0].tasks).toHaveLength(2);
    expect(result.current.projects[0].tasks[1].text).toBe("새 태스크");
    expect(result.current.projects[0].tasks[1].done).toBe(false);
  });

  it("loadProjects handles invalid JSON in localStorage", async () => {
    localStorage.setItem(KEY, "not-valid-json");
    const { result } = renderHook(() => useProjects(null), { wrapper });
    await act(async () => { await result.current.loadProjects(); });
    expect(result.current.projects).toHaveLength(0);
  });
});
