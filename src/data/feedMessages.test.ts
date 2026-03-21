import { describe, it, expect } from "vitest";
import { CEO_ANNOUNCEMENTS, AGENT_REACTIONS } from "./feedMessages";

describe("CEO_ANNOUNCEMENTS", () => {
  it("has exactly 3 templates", () => {
    expect(CEO_ANNOUNCEMENTS).toHaveLength(3);
  });

  it("first template includes active and total counts", () => {
    const msg = CEO_ANNOUNCEMENTS[0](3, 10);
    expect(msg).toContain("3");
    expect(msg).toContain("10");
  });

  it("second template includes active count", () => {
    const msg = CEO_ANNOUNCEMENTS[1](5, 20);
    expect(msg).toContain("5");
  });

  it("third template includes both active and total counts", () => {
    const msg = CEO_ANNOUNCEMENTS[2](4, 8);
    expect(msg).toContain("4");
    expect(msg).toContain("8");
  });

  it("all templates return non-empty strings", () => {
    CEO_ANNOUNCEMENTS.forEach(fn => {
      const result = fn(1, 5);
      expect(typeof result).toBe("string");
      expect(result.length).toBeGreaterThan(0);
    });
  });

  it("handles zero counts without crashing", () => {
    CEO_ANNOUNCEMENTS.forEach(fn => {
      expect(() => fn(0, 0)).not.toThrow();
    });
  });
});

describe("AGENT_REACTIONS", () => {
  const EXPECTED_RANKS = ["CTO", "Lead", "Senior", "Junior", "Assistant"];

  it("contains all expected ranks", () => {
    EXPECTED_RANKS.forEach(rank => {
      expect(AGENT_REACTIONS[rank]).toBeDefined();
    });
  });

  it("each rank has at least 3 messages", () => {
    EXPECTED_RANKS.forEach(rank => {
      expect(AGENT_REACTIONS[rank].length).toBeGreaterThanOrEqual(3);
    });
  });

  it("all messages are non-empty strings", () => {
    Object.values(AGENT_REACTIONS).flat().forEach(msg => {
      expect(typeof msg).toBe("string");
      expect(msg.length).toBeGreaterThan(0);
    });
  });

  it("no rank has undefined messages", () => {
    EXPECTED_RANKS.forEach(rank => {
      AGENT_REACTIONS[rank].forEach(msg => {
        expect(msg).not.toBeUndefined();
      });
    });
  });

  it("returns empty array for unknown rank (graceful fallback)", () => {
    expect(AGENT_REACTIONS["Unknown"] ?? []).toEqual([]);
  });
});
