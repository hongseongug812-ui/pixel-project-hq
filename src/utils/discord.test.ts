import { describe, it, expect, vi, afterEach } from "vitest";
import { sendDiscord } from "./discord";

describe("sendDiscord", () => {
  afterEach(() => vi.restoreAllMocks());

  it("returns false for empty webhook URL", async () => {
    expect(await sendDiscord("", "hello")).toBe(false);
    expect(await sendDiscord("   ", "hello")).toBe(false);
  });

  it("returns true on 200 OK", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: true }));
    expect(await sendDiscord("https://discord.com/api/webhooks/123/abc", "test")).toBe(true);
  });

  it("returns false on non-OK response", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: false }));
    expect(await sendDiscord("https://discord.com/api/webhooks/123/abc", "test")).toBe(false);
  });

  it("returns false on network error", async () => {
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("network error")));
    expect(await sendDiscord("https://discord.com/api/webhooks/123/abc", "test")).toBe(false);
  });

  it("sends username option when provided", async () => {
    const mockFetch = vi.fn().mockResolvedValue({ ok: true });
    vi.stubGlobal("fetch", mockFetch);
    await sendDiscord("https://discord.com/api/webhooks/123/abc", "hi", { username: "Bot" });
    const body = JSON.parse(mockFetch.mock.calls[0][1].body);
    expect(body.username).toBe("Bot");
    expect(body.content).toBe("hi");
  });

  it("does not include username key when not provided", async () => {
    const mockFetch = vi.fn().mockResolvedValue({ ok: true });
    vi.stubGlobal("fetch", mockFetch);
    await sendDiscord("https://discord.com/api/webhooks/123/abc", "hi");
    const body = JSON.parse(mockFetch.mock.calls[0][1].body);
    expect(body.username).toBeUndefined();
  });
});
