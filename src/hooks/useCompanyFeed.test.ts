import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { renderHook, act } from "@testing-library/react";

vi.mock("../utils/discord", () => ({ sendDiscord: vi.fn().mockResolvedValue(true) }));
vi.mock("../components/MyPage", () => ({
  loadUserSettings: () => ({ discordWebhook: "" }),
  loadMyAvatar: () => ({ name: "ME", emoji: "🧑", bodyColor: "#a78bfa" }),
}));

import { useCompanyFeed } from "./useCompanyFeed";

describe("useCompanyFeed", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it("starts with empty messages when localStorage is empty", () => {
    const { result } = renderHook(() => useCompanyFeed([]));
    expect(result.current.messages).toHaveLength(0);
  });

  it("clearFeed removes all messages and localStorage entry", () => {
    const { result } = renderHook(() => useCompanyFeed([]));

    act(() => { result.current.postAsMe("hello", "general"); });
    expect(result.current.messages.length).toBeGreaterThan(0);

    act(() => { result.current.clearFeed(); });
    expect(result.current.messages).toHaveLength(0);
    // persist effect가 빈 배열을 저장하거나 키를 삭제 — 어느 쪽이든 메시지는 없어야 함
    const stored = localStorage.getItem("phq_company_feed");
    if (stored !== null) expect(JSON.parse(stored)).toHaveLength(0);
  });

  it("postAsMe adds message with correct agentId and channel", () => {
    const { result } = renderHook(() => useCompanyFeed([]));

    act(() => { result.current.postAsMe("안녕하세요!", "dev"); });

    const msg = result.current.messages[0];
    expect(msg.agentId).toBe("me");
    expect(msg.channel).toBe("dev");
    expect(msg.content).toBe("안녕하세요!");
    expect(msg.type).toBe("chat");
  });

  it("each message has unique id", () => {
    const { result } = renderHook(() => useCompanyFeed([]));

    act(() => {
      result.current.postAsMe("msg 1", "general");
      result.current.postAsMe("msg 2", "general");
    });

    const ids = result.current.messages.map(m => m.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("messages are persisted to localStorage", () => {
    const { result } = renderHook(() => useCompanyFeed([]));

    act(() => { result.current.postAsMe("저장 테스트", "general"); });

    const stored = localStorage.getItem("phq_company_feed");
    expect(stored).not.toBeNull();
    expect(stored).toContain("저장 테스트");
  });

  it("postCEOAnnouncement posts message with announcement type", () => {
    const { result } = renderHook(() => useCompanyFeed([]));

    act(() => { result.current.postCEOAnnouncement("전사 공지입니다"); });

    const msg = result.current.messages.find(m => m.type === "announcement");
    expect(msg).toBeDefined();
    expect(msg?.content).toContain("전사 공지입니다");
  });
});
