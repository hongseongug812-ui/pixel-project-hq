import { describe, it, expect, vi } from "vitest";

// supabase 클라이언트는 환경변수 없이 테스트할 수 없으므로 모킹
vi.mock("./supabase", () => ({ supabase: null }));

import { rowToProject, FIELD_MAP } from "./db";

describe("rowToProject", () => {
  const minimalRow = {
    id: 1, name: "Test", status: "active", progress: 50,
    priority: "high", last_activity: "2024-01-01", room: "lab",
  };

  it("converts minimal row to Project with correct fields", () => {
    const p = rowToProject(minimalRow);
    expect(p.id).toBe(1);
    expect(p.name).toBe("Test");
    expect(p.status).toBe("active");
    expect(p.progress).toBe(50);
    expect(p.priority).toBe("high");
    expect(p.lastActivity).toBe("2024-01-01");
    expect(p.room).toBe("lab");
  });

  it("defaults optional nullable fields to null when absent", () => {
    const p = rowToProject(minimalRow);
    expect(p.serverUrl).toBeNull();
    expect(p.githubUrl).toBeNull();
    expect(p.thumbnail).toBeNull();
    expect(p.description).toBeNull();
    expect(p.assignedAgentId).toBeNull();
    expect(p.budget).toBeNull();
    expect(p.targetDate).toBeNull();
    expect(p.startDate).toBeNull();
    expect(p.endDate).toBeNull();
  });

  it("defaults tasks and stack to empty arrays when absent", () => {
    const p = rowToProject(minimalRow);
    expect(p.tasks).toEqual([]);
    expect(p.stack).toEqual([]);
  });

  it("defaults featured to false when absent", () => {
    expect(rowToProject(minimalRow).featured).toBe(false);
  });

  it("maps snake_case server_url → serverUrl", () => {
    const p = rowToProject({ ...minimalRow, server_url: "https://example.com" });
    expect(p.serverUrl).toBe("https://example.com");
  });

  it("maps snake_case github_url → githubUrl", () => {
    const p = rowToProject({ ...minimalRow, github_url: "https://github.com/user/repo" });
    expect(p.githubUrl).toBe("https://github.com/user/repo");
  });

  it("maps snake_case assigned_agent_id → assignedAgentId", () => {
    const p = rowToProject({ ...minimalRow, assigned_agent_id: "a1" });
    expect(p.assignedAgentId).toBe("a1");
  });

  it("maps snake_case target_date → targetDate", () => {
    const p = rowToProject({ ...minimalRow, target_date: "2025-12-31" });
    expect(p.targetDate).toBe("2025-12-31");
  });

  it("preserves tasks array when provided", () => {
    const tasks = [{ id: "t1", text: "작업", done: false }];
    const p = rowToProject({ ...minimalRow, tasks });
    expect(p.tasks).toEqual(tasks);
  });

  it("preserves stack array when provided", () => {
    const stack = ["React", "TypeScript"];
    const p = rowToProject({ ...minimalRow, stack });
    expect(p.stack).toEqual(stack);
  });
});

describe("FIELD_MAP", () => {
  it("maps camelCase keys to snake_case values", () => {
    expect(FIELD_MAP.lastActivity).toBe("last_activity");
    expect(FIELD_MAP.serverUrl).toBe("server_url");
    expect(FIELD_MAP.githubUrl).toBe("github_url");
    expect(FIELD_MAP.assignedAgentId).toBe("assigned_agent_id");
    expect(FIELD_MAP.targetDate).toBe("target_date");
    expect(FIELD_MAP.startDate).toBe("start_date");
    expect(FIELD_MAP.endDate).toBe("end_date");
  });
});
