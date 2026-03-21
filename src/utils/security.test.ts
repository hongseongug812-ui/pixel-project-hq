import { describe, it, expect, vi, afterEach } from "vitest";
import { safeOpenUrl, validateProjectInput, makeRateLimiter } from "./security";

describe("safeOpenUrl", () => {
  afterEach(() => vi.restoreAllMocks());

  it("opens valid https URL", () => {
    const spy = vi.spyOn(window, "open").mockImplementation(() => null);
    safeOpenUrl("https://example.com");
    expect(spy).toHaveBeenCalledWith("https://example.com/", "_blank", "noopener,noreferrer");
  });

  it("prepends https:// to bare domain", () => {
    const spy = vi.spyOn(window, "open").mockImplementation(() => null);
    safeOpenUrl("example.com");
    expect(spy).toHaveBeenCalledWith("https://example.com/", "_blank", "noopener,noreferrer");
  });

  it("blocks javascript: protocol", () => {
    const spy = vi.spyOn(window, "open").mockImplementation(() => null);
    safeOpenUrl("javascript:alert(1)");
    expect(spy).not.toHaveBeenCalled();
  });

  it("blocks data: protocol", () => {
    const spy = vi.spyOn(window, "open").mockImplementation(() => null);
    safeOpenUrl("data:text/html,<script>alert(1)</script>");
    expect(spy).not.toHaveBeenCalled();
  });

  it("does nothing for null/empty input", () => {
    const spy = vi.spyOn(window, "open").mockImplementation(() => null);
    safeOpenUrl(null);
    safeOpenUrl("");
    safeOpenUrl("   ");
    expect(spy).not.toHaveBeenCalled();
  });

  it("does nothing for completely invalid URL", () => {
    const spy = vi.spyOn(window, "open").mockImplementation(() => null);
    safeOpenUrl(":::bad:::url:::");
    expect(spy).not.toHaveBeenCalled();
  });
});

describe("validateProjectInput", () => {
  it("returns null for valid input", () => {
    expect(validateProjectInput({ name: "My Project" })).toBeNull();
  });

  it("errors on empty name", () => {
    const err = validateProjectInput({ name: "   " });
    expect(err?.field).toBe("name");
  });

  it("errors on name too long (>120)", () => {
    const err = validateProjectInput({ name: "x".repeat(121) });
    expect(err?.field).toBe("name");
  });

  it("errors on description too long (>500)", () => {
    const err = validateProjectInput({ name: "ok", description: "x".repeat(501) });
    expect(err?.field).toBe("description");
  });

  it("errors when stack has >20 items", () => {
    const stack = Array(21).fill("item");
    const err = validateProjectInput({ name: "ok", stack });
    expect(err?.field).toBe("stack");
  });

  it("errors when stack item is too long (>50)", () => {
    const err = validateProjectInput({ name: "ok", stack: ["x".repeat(51)] });
    expect(err?.field).toBe("stack");
  });

  it("errors when tasks exceed 50", () => {
    const tasks = Array(51).fill({ text: "task" });
    const err = validateProjectInput({ name: "ok", tasks });
    expect(err?.field).toBe("tasks");
  });

  it("errors when task text exceeds 200 chars", () => {
    const err = validateProjectInput({ name: "ok", tasks: [{ text: "x".repeat(201) }] });
    expect(err?.field).toBe("tasks");
  });

  it("errors when serverUrl exceeds 300 chars", () => {
    const err = validateProjectInput({ name: "ok", serverUrl: "https://" + "x".repeat(294) });
    expect(err?.field).toBe("serverUrl");
  });

  it("accepts null URL fields", () => {
    expect(validateProjectInput({ name: "ok", serverUrl: null, githubUrl: null })).toBeNull();
  });
});

describe("makeRateLimiter", () => {
  it("allows first call immediately", () => {
    const allow = makeRateLimiter(1000);
    expect(allow()).toBe(true);
  });

  it("blocks second call within interval", () => {
    const allow = makeRateLimiter(1000);
    allow();
    expect(allow()).toBe(false);
  });

  it("allows call after interval has passed", () => {
    vi.useFakeTimers();
    const allow = makeRateLimiter(1000);
    allow();
    vi.advanceTimersByTime(1001);
    expect(allow()).toBe(true);
    vi.useRealTimers();
  });
});
