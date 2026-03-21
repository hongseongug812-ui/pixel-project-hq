/**
 * useCompanyFeed의 자동화 사이드 이펙트만 담당한다.
 * - CEO 아침 공지 (하루 1회)
 * - 에이전트 랜덤 활동 메시지 (5분 간격)
 * - 프로젝트 변화 감지 (태스크 완료, 진행률 증가, 신규 등록)
 * - AutoPilot 커스텀 이벤트 수신
 *
 * 상태 소유권은 없음 — addMessage / postMessage 콜백을 주입받아 사용한다.
 */
import { useEffect, useRef } from "react";
import { AGENTS } from "../data/constants";
import { PHQ_EVENTS } from "../data/events";
import { CEO_ANNOUNCEMENTS, AGENT_REACTIONS } from "../data/feedMessages";
import { loadUserSettings } from "../components/MyPage";
import { sendDiscord } from "../utils/discord";
import { usePageVisible } from "./usePageVisible";
import type { Project } from "../types";
import type { FeedMessage, FeedChannel } from "./useCompanyFeed";

type AddMsgFn    = (msg: Omit<FeedMessage, "id" | "timestamp">) => FeedMessage;
type PostMsgFn   = (msg: Omit<FeedMessage, "id" | "timestamp">, toDiscord?: boolean) => FeedMessage;

const AGENT_MAP = Object.fromEntries(AGENTS.map(a => [a.id, a]));
const AGENT_ACTIVITY_INTERVAL_MS = 5 * 60 * 1000; // 5분

/** 에이전트 rank + 이벤트 종류에 따른 프로젝트 이벤트 메시지 생성 */
function projectEventMsg(agentId: string, event: "task_done" | "progress_up", projectName: string): string {
  const agent = AGENT_MAP[agentId];
  if (!agent) return "";
  const prefix = `[${projectName}]`;
  if (event === "task_done") {
    if (agent.rank === "Senior") return `${prefix} 태스크 완료 처리했습니다. 다음 단계로 넘어갑니다.`;
    if (agent.rank === "Junior") return `${prefix} 태스크 완료! 드디어 해냈어요 🎉`;
    return `${prefix} 태스크 완료 처리됨.`;
  }
  if (agent.rank === "CTO") return `${prefix} 진행률 업데이트 확인. 일정 내 완료 가능할 것으로 판단.`;
  return `${prefix} 진행 중입니다. 꾸준히 가고 있어요.`;
}

export function useFeedAutomation(
  projects: Project[],
  addMessage: AddMsgFn,
  postMessage: PostMsgFn,
) {
  const pageVisible        = usePageVisible();
  const announcedTodayRef  = useRef(false);
  const lastProjectCount   = useRef(projects.length);
  const lastProjectRef     = useRef<Project[]>([]);

  // ── CEO 아침 공지 (하루 1회) ────────────────────────────────────────
  useEffect(() => {
    if (announcedTodayRef.current || projects.length === 0) return;
    const ceo = AGENTS.find(a => a.rank === "CEO");
    if (!ceo) return;

    const todayKey = `phq_ceo_announced_${new Date().toDateString()}`;
    if (localStorage.getItem(todayKey)) { announcedTodayRef.current = true; return; }

    const delay = setTimeout(() => {
      const active = projects.filter(p => p.status === "active" || p.status === "pivot").length;
      const template = CEO_ANNOUNCEMENTS[new Date().getDate() % CEO_ANNOUNCEMENTS.length];
      postMessage({ agentId: ceo.id, agentName: ceo.name, agentEmoji: ceo.emoji, agentColor: ceo.body, channel: "announcements", content: template(active, projects.length), type: "announcement" }, true);
      localStorage.setItem(todayKey, "1");
      announcedTodayRef.current = true;

      const cto = AGENTS.find(a => a.rank === "CTO");
      if (cto) {
        setTimeout(() => {
          postMessage({ agentId: cto.id, agentName: cto.name, agentEmoji: cto.emoji, agentColor: cto.body, channel: "announcements", content: "기술 현황 보고 준비하겠습니다. 오늘 코드 리뷰 2건 예정.", type: "chat" });
        }, 8000);
      }
    }, 3000);

    return () => clearTimeout(delay);
  }, [projects.length]);

  // ── 에이전트 활동 메시지 (5분, 탭 숨김 시 중단) ─────────────────────
  useEffect(() => {
    if (!pageVisible) return;
    const iv = setInterval(() => {
      const agent = AGENTS[Math.floor(Math.random() * AGENTS.length)];
      const reactions = AGENT_REACTIONS[agent.rank] ?? [];
      if (reactions.length === 0) return;
      const channel: FeedChannel = agent.rank === "CTO" || agent.rank === "Senior" ? "dev" : "general";
      addMessage({ agentId: agent.id, agentName: agent.name, agentEmoji: agent.emoji, agentColor: agent.body, channel, content: reactions[Math.floor(Math.random() * reactions.length)], type: "chat" });
    }, AGENT_ACTIVITY_INTERVAL_MS);
    return () => clearInterval(iv);
  }, [addMessage, pageVisible]);

  // ── 신규 프로젝트 등록 감지 ──────────────────────────────────────────
  useEffect(() => {
    if (lastProjectCount.current === 0) { lastProjectCount.current = projects.length; return; }
    if (projects.length > lastProjectCount.current) {
      const newest = projects[0];
      const lead = AGENTS.find(a => a.rank === "Lead");
      if (lead && newest) {
        const settings = loadUserSettings();
        const msg = postMessage({ agentId: lead.id, agentName: lead.name, agentEmoji: lead.emoji, agentColor: lead.body, channel: "general", content: `📁 새 프로젝트 "${newest.name}" 등록됨. 담당 배정 및 초기 계획 수립 시작합니다.`, type: "chat" });
        sendDiscord(settings.discordWebhook, msg.content, { username: `${lead.emoji} ${lead.name} | PIXEL HQ` });
      }
    }
    lastProjectCount.current = projects.length;
  }, [projects.length]);

  // ── 태스크 완료 / 진행률 증가 감지 ─────────────────────────────────
  useEffect(() => {
    const prev = lastProjectRef.current;
    if (prev.length === 0) { lastProjectRef.current = projects; return; }

    for (const curr of projects) {
      const old = prev.find(p => p.id === curr.id);
      if (!old) continue;
      const agent = curr.assignedAgentId ? AGENT_MAP[curr.assignedAgentId] : null;
      if (!agent) continue;

      const newDone = curr.tasks.filter(t => t.done).length;
      if (newDone > old.tasks.filter(t => t.done).length) {
        const content = projectEventMsg(agent.id, "task_done", curr.name);
        if (content) addMessage({ agentId: agent.id, agentName: agent.name, agentEmoji: agent.emoji, agentColor: agent.body, channel: "dev", content, type: "chat" });
      }
      if (curr.progress - old.progress >= 10) {
        const content = projectEventMsg(agent.id, "progress_up", curr.name);
        if (content) addMessage({ agentId: agent.id, agentName: agent.name, agentEmoji: agent.emoji, agentColor: agent.body, channel: "dev", content, type: "chat" });
      }
    }
    lastProjectRef.current = projects;
  }, [projects]);

  // ── AutoPilot 커스텀 이벤트 수신 ────────────────────────────────────
  useEffect(() => {
    const VALID_CHANNELS = new Set<FeedChannel>(["general", "announcements", "dev", "ops"]);

    function onFeedEvent(e: Event) {
      if (!(e instanceof CustomEvent)) return;
      const d = e.detail;
      // 런타임 검증 — malformed event 방어
      if (!d || typeof d.agentId !== "string" || typeof d.content !== "string") return;
      const agent = AGENT_MAP[d.agentId];
      if (!agent) return;
      const channel: FeedChannel = VALID_CHANNELS.has(d.channel) ? d.channel : "general";
      addMessage({ agentId: agent.id, agentName: agent.name, agentEmoji: agent.emoji, agentColor: agent.body, channel, content: d.content, type: "alert" });
    }
    window.addEventListener(PHQ_EVENTS.FEED, onFeedEvent);
    return () => window.removeEventListener(PHQ_EVENTS.FEED, onFeedEvent);
  }, [addMessage]);
}
