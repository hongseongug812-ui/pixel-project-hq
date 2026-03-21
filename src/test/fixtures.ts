/**
 * 공통 테스트 픽스처 — 각 테스트 파일에서 makeProject를 중복 정의하지 않도록.
 */
import type { Project } from "../types";

export const makeProject = (overrides: Partial<Project> = {}): Project => ({
  id: 1,
  name: "Test Project",
  status: "active",
  priority: "medium",
  progress: 50,
  lastActivity: new Date().toISOString().slice(0, 10),
  room: "lab",
  serverUrl: null,
  githubUrl: null,
  thumbnail: null,
  description: null,
  featured: false,
  startDate: null,
  endDate: null,
  assignedAgentId: null,
  budget: null,
  targetDate: null,
  stack: [],
  tasks: [],
  ...overrides,
});
