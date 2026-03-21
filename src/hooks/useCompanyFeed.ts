/**
 * 회사 피드 상태 관리 (코어).
 * 메시지 추가·저장·삭제·사용자 포스팅만 담당한다.
 * 자동화 사이드 이펙트는 useFeedAutomation이 처리한다.
 */
import { useState, useEffect, useCallback } from "react";
import { AGENTS } from "../data/constants";
import { loadUserSettings } from "../components/MyPage";
import { sendDiscord } from "../utils/discord";
import { readStorage, isObjectArray, isPlainObject } from "../utils/storage";
import { useFeedAutomation } from "./useFeedAutomation";
import type { Project } from "../types";

export type FeedChannel = "general" | "announcements" | "dev" | "ops";

export interface FeedMessage {
  id: string;
  agentId: string;
  agentName: string;
  agentEmoji: string;
  agentColor: string;
  channel: FeedChannel;
  content: string;
  timestamp: number;
  type: "chat" | "announcement" | "alert" | "system";
}

const FEED_KEY = "phq_company_feed";
const MAX_FEED = 120;
const MY_AVATAR_KEY = "phq_my_avatar";

interface MyAvatar { name?: string; emoji?: string; bodyColor?: string }

function isFeedArray(v: unknown): v is FeedMessage[] { return isObjectArray(v); }
function isMyAvatar(v: unknown): v is MyAvatar      { return isPlainObject(v); }

function loadFeed(): FeedMessage[] {
  return readStorage(FEED_KEY, isFeedArray, []);
}

function saveFeed(msgs: FeedMessage[]) {
  try {
    localStorage.setItem(FEED_KEY, JSON.stringify(msgs.slice(-MAX_FEED)));
  } catch {
    // localStorage quota exceeded — silently skip persistence
  }
}

export function useCompanyFeed(projects: Project[]) {
  const [messages, setMessages] = useState<FeedMessage[]>(loadFeed);

  // ── 영속성 ───────────────────────────────────────────────────────────
  useEffect(() => { saveFeed(messages); }, [messages]);

  // ── 메시지 추가 ──────────────────────────────────────────────────────
  const addMessage = useCallback((msg: Omit<FeedMessage, "id" | "timestamp">): FeedMessage => {
    const full: FeedMessage = { ...msg, id: `${Date.now()}_${Math.random()}`, timestamp: Date.now() };
    setMessages(prev => [...prev, full]);
    return full;
  }, []);

  const postMessage = useCallback((msg: Omit<FeedMessage, "id" | "timestamp">, toDiscord = false): FeedMessage => {
    const full = addMessage(msg);
    if (toDiscord) {
      const settings = loadUserSettings();
      sendDiscord(settings.discordWebhook, full.content, { username: `${full.agentEmoji} ${full.agentName} | PIXEL HQ` });
    }
    return full;
  }, [addMessage]);

  // ── 자동화 사이드 이펙트 위임 ────────────────────────────────────────
  useFeedAutomation(projects, addMessage, postMessage);

  // ── 사용자 포스팅 ("me") ─────────────────────────────────────────────
  const postAsMe = useCallback((content: string, channel: FeedChannel) => {
    const av = readStorage(MY_AVATAR_KEY, isMyAvatar, {});
    addMessage({
      agentId:    "me",
      agentName:  av.name      ?? "ME",
      agentEmoji: av.emoji     ?? "🧑",
      agentColor: av.bodyColor ?? "#a78bfa",
      channel,
      content,
      type: "chat",
    });
  }, [addMessage]);

  // ── CEO 수동 공지 ────────────────────────────────────────────────────
  const postCEOAnnouncement = useCallback((content: string) => {
    const ceo = AGENTS.find(a => a.rank === "CEO");
    if (!ceo) return;
    postMessage({
      agentId: ceo.id, agentName: ceo.name, agentEmoji: ceo.emoji, agentColor: ceo.body,
      channel: "announcements", content: `📢 ${content}`, type: "announcement",
    }, true);
  }, [postMessage]);

  // ── 피드 초기화 ──────────────────────────────────────────────────────
  const clearFeed = useCallback(() => {
    setMessages([]);
    localStorage.removeItem(FEED_KEY);
  }, []);

  return { messages, postAsMe, postCEOAnnouncement, clearFeed };
}
