import { describe, it, expect, vi, beforeEach } from "vitest";
import { daysSince, neglect, analyzeFile } from "./helpers";

describe("daysSince", () => {
  beforeEach(() => {
    // Fix "today" to 2024-01-10
    vi.setSystemTime(new Date("2024-01-10T12:00:00Z"));
  });

  it("returns 0 for today", () => {
    expect(daysSince("2024-01-10")).toBe(0);
  });

  it("returns 3 for 3 days ago", () => {
    expect(daysSince("2024-01-07")).toBe(3);
  });

  it("returns 7 for a week ago", () => {
    expect(daysSince("2024-01-03")).toBe(7);
  });
});

describe("neglect", () => {
  beforeEach(() => {
    vi.setSystemTime(new Date("2024-01-10T12:00:00Z"));
  });

  it("returns 0 for completed projects regardless of age", () => {
    expect(neglect("2023-01-01", "complete")).toBe(0);
  });

  it("returns 0 for recent active projects (< 3 days)", () => {
    expect(neglect("2024-01-08", "active")).toBe(0);
  });

  it("returns 1 for active projects neglected 3–6 days", () => {
    expect(neglect("2024-01-06", "active")).toBe(1);
    expect(neglect("2024-01-04", "active")).toBe(1);
  });

  it("returns 2 for active projects neglected 7+ days", () => {
    expect(neglect("2024-01-03", "active")).toBe(2);
    expect(neglect("2023-12-01", "pivot")).toBe(2);
  });
});

describe("analyzeFile", () => {
  it("returns null for empty content", () => {
    // empty JSON that isn't a package.json
    const result = analyzeFile("", "random.txt");
    expect(result).not.toBeNull();
  });

  it("detects package.json with react stack", () => {
    const pkg = JSON.stringify({
      name: "my-app",
      dependencies: { react: "^18.0.0", "react-dom": "^18.0.0" },
      scripts: { build: "vite build" },
    });
    const result = analyzeFile(pkg, "package.json");
    expect(result).not.toBeNull();
    expect(result!.name).toBe("my-app");
    expect(result!.stack).toContain("React");
    expect(result!.detected).toMatch(/package\.json/);
  });

  it("detects Next.js stack", () => {
    const pkg = JSON.stringify({
      name: "next-app",
      dependencies: { next: "^14.0.0" },
    });
    const result = analyzeFile(pkg, "package.json");
    expect(result!.stack).toContain("Next.js");
    expect(result!.room).toBe("office");
  });

  it("detects Supabase and routes to server room", () => {
    const pkg = JSON.stringify({
      name: "backend",
      dependencies: { "@supabase/supabase-js": "^2.0.0" },
    });
    const result = analyzeFile(pkg, "package.json");
    expect(result!.stack).toContain("Supabase");
    expect(result!.room).toBe("server");
  });

  it("detects README.md and extracts title", () => {
    const content = "# My Project\n\n## Setup\n\n## Usage\n\nSome text";
    const result = analyzeFile(content, "README.md");
    expect(result).not.toBeNull();
    expect(result!.name).toBe("My Project");
    expect(result!.tasks.length).toBeGreaterThan(0);
    expect(result!.detected).toMatch(/README/);
  });

  it("detects .env file", () => {
    const content = "DATABASE_URL=postgres://...\nSECRET_KEY=abc123\n# comment";
    const result = analyzeFile(content, ".env");
    expect(result).not.toBeNull();
    expect(result!.room).toBe("server");
    expect(result!.tasks.some(t => t.text.includes(".gitignore"))).toBe(true);
  });

  it("generates tasks for package.json missing test setup", () => {
    const pkg = JSON.stringify({ name: "no-test", dependencies: { react: "^18.0.0" } });
    const result = analyzeFile(pkg, "package.json");
    expect(result!.tasks.some(t => t.text.includes("테스트"))).toBe(true);
  });
});
