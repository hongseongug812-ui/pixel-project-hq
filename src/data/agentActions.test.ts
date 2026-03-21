import { describe, it, expect } from "vitest";
import { LOG_ACTIONS } from "./agentActions";

describe("LOG_ACTIONS", () => {
  it("has at least 15 action templates", () => {
    expect(LOG_ACTIONS.length).toBeGreaterThanOrEqual(15);
  });

  it("each template returns a non-empty string", () => {
    const project = { name: "테스트 프로젝트" };
    LOG_ACTIONS.forEach(fn => {
      const result = fn(project);
      expect(typeof result).toBe("string");
      expect(result.length).toBeGreaterThan(0);
    });
  });

  it("project-name templates interpolate the project name", () => {
    const named = LOG_ACTIONS.filter(fn => fn({ name: "MARKER" }).includes("MARKER"));
    expect(named.length).toBeGreaterThan(0);
  });

  it("server/standalone templates don't require project name", () => {
    const standalone = LOG_ACTIONS.filter(fn => !fn({ name: "X" }).includes("X"));
    expect(standalone.length).toBeGreaterThan(0);
  });
});
