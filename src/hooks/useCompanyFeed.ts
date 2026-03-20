import { useState, useEffect, useCallback, useRef } from "react";
import { AGENTS } from "../data/constants";
import { loadUserSettings } from "../components/MyPage";
import type { Project } from "../types";

export type FeedChannel = "general" | "announcements" | "dev" | "ops";

export interface FeedMessage {
  id: string;
  agentId: string;    // "me" | agent.id | "system"
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

function loadFeed(): FeedMessage[] {
  try {
    const raw = localStorage.getItem(FEED_KEY);
    if (raw) return JSON.parse(raw) as FeedMessage[];
  } catch { /* ignore */ }
  return [];
}

function saveFeed(msgs: FeedMessage[]) {
  try {
    localStorage.setItem(FEED_KEY, JSON.stringify(msgs.slice(-MAX_FEED)));
  } catch { /* ignore */ }
}

const AGENT_MAP = Object.fromEntries(AGENTS.map(a => [a.id, a]));

// CEO morning announcement templates
const CEO_ANNOUNCEMENTS = [
  (active: number, total: number) => `📢 전 직원 여러분, 오늘도 힘차게 시작합시다. 현재 ${active}개 프로젝트 활성화, 총 ${total}개 운영 중입니다. 각자 맡은 업무에 최선을 다해주세요.`,
  (active: number, _: number) => `📢 오늘 우선순위: 활성 프로젝트 ${active}건 집중 진행. 블로커 발생 시 즉시 에스컬레이션 바랍니다.`,
  (active: number, total: number) => `📢 주간 목표 점검. 총 ${total}건 중 ${active}건 진행 중. 마감 임박 프로젝트 우선 처리 부탁드립니다.`,
];

// Agent reaction templates by rank
const AGENT_REACTIONS: Record<string, string[]> = {
  CTO: [
    "기술 스택 검토가 필요한 항목이 있습니다. 아키텍처 회의 잡겠습니다.",
    "코드 품질 기준 상향 검토 중입니다. PR 리뷰 강화 예정.",
    "인프라 현황 파악 완료. 최적화 포인트 3개 발견했습니다.",
  ],
  Lead: [
    "팀 조율 사항 공유드립니다. 오늘 스탠드업 11시로 조정.",
    "스프린트 플래닝 진행 중. 백로그 정리 협조 부탁드립니다.",
    "협업 이슈 있는 분 DM 주세요. 같이 해결해봅시다.",
  ],
  Senior: [
    "개발 완료한 기능 QA 요청드립니다.",
    "리팩토링 작업 진행 중. 성능 20% 개선 예상됩니다.",
    "버그 수정 완료. 테스트 커버리지 높였습니다.",
  ],
  Junior: [
    "열심히 배우면서 작업 중입니다! 막히는 부분 있으면 도움 요청하겠습니다 💪",
    "새로운 기능 개발 시작했습니다. 피드백 주시면 반영할게요!",
    "문서화 작업 병행 중입니다. 나중에 팀에 공유할게요!",
  ],
  Assistant: [
    "업무 지원 준비 완료! 필요한 거 있으시면 말씀해주세요.",
    "미팅 자료 정리 완료했습니다. 공유 드릴까요?",
    "일정 조율 및 리마인더 세팅 완료.",
  ],
};

// Project event messages
function projectEventMsg(agentId: string, event: string, projectName: string): string {
  const agent = AGENT_MAP[agentId];
  if (!agent) return "";
  const rank = agent.rank;
  const prefix = `[${projectName}]`;
  if (event === "task_done") {
    if (rank === "Senior") return `${prefix} 태스크 완료 처리했습니다. 다음 단계로 넘어갑니다.`;
    if (rank === "Junior") return `${prefix} 태스크 완료! 드디어 해냈어요 🎉`;
    return `${prefix} 태스크 완료 처리됨.`;
  }
  if (event === "progress_up") {
    if (rank === "CTO") return `${prefix} 진행률 업데이트 확인. 일정 내 완료 가능할 것으로 판단.`;
    return `${prefix} 진행 중입니다. 꾸준히 가고 있어요.`;
  }
  return `${prefix} 업무 처리 중.`;
}

// Auto-post to Discord
async function postToDiscord(webhook: string, content: string, agentName: string, agentEmoji: string) {
  if (!webhook.trim()) return;
  try {
    await fetch(webhook.trim(), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        username: `${agentEmoji} ${agentName} | PIXEL HQ`,
        content,
      }),
    });
  } catch { /* silent */ }
}

export function useCompanyFeed(projects: Project[]) {
  const [messages, setMessages] = useState<FeedMessage[]>(loadFeed);
  const lastProjectRef = useRef<Project[]>([]);
  const announcedTodayRef = useRef(false);
  const lastProjectCount = useRef(projects.length);

  // Persist
  useEffect(() => {
    saveFeed(messages);
  }, [messages]);

  const addMessage = useCallback((msg: Omit<FeedMessage, "id" | "timestamp">) => {
    const full: FeedMessage = { ...msg, id: `${Date.now()}_${Math.random()}`, timestamp: Date.now() };
    setMessages(prev => [...prev, full]);
    return full;
  }, []);

  const postMessage = useCallback((msg: Omit<FeedMessage, "id" | "timestamp">, toDiscord = false) => {
    const full = addMessage(msg);
    if (toDiscord) {
      const settings = loadUserSettings();
      postToDiscord(settings.discordWebhook, full.content, full.agentName, full.agentEmoji);
    }
    return full;
  }, [addMessage]);

  // CEO morning announcement (once per day)
  useEffect(() => {
    if (announcedTodayRef.current) return;
    const ceo = AGENTS.find(a => a.rank === "CEO");
    if (!ceo || projects.length === 0) return;

    const todayKey = `phq_ceo_announced_${new Date().toDateString()}`;
    if (localStorage.getItem(todayKey)) { announcedTodayRef.current = true; return; }

    const delay = setTimeout(() => {
      const active = projects.filter(p => p.status === "active" || p.status === "pivot").length;
      const template = CEO_ANNOUNCEMENTS[new Date().getDate() % CEO_ANNOUNCEMENTS.length];
      const content = template(active, projects.length);

      postMessage({
        agentId: ceo.id,
        agentName: ceo.name,
        agentEmoji: ceo.emoji,
        agentColor: ceo.body,
        channel: "announcements",
        content,
        type: "announcement",
      }, true);

      localStorage.setItem(todayKey, "1");
      announcedTodayRef.current = true;

      // CTO responds after 8s
      const cto = AGENTS.find(a => a.rank === "CTO");
      if (cto) {
        setTimeout(() => {
          postMessage({
            agentId: cto.id,
            agentName: cto.name,
            agentEmoji: cto.emoji,
            agentColor: cto.body,
            channel: "announcements",
            content: "기술 현황 보고 준비하겠습니다. 오늘 코드 리뷰 2건 예정.",
            type: "chat",
          });
        }, 8000);
      }
    }, 3000);

    return () => clearTimeout(delay);
  }, [projects.length]);

  // Agent daily activity messages (every 5min, random agent)
  useEffect(() => {
    const interval = setInterval(() => {
      const randomAgent = AGENTS[Math.floor(Math.random() * AGENTS.length)];
      const reactions = AGENT_REACTIONS[randomAgent.rank] ?? [];
      if (reactions.length === 0) return;
      const content = reactions[Math.floor(Math.random() * reactions.length)];
      const channel: FeedChannel = randomAgent.rank === "CTO" || randomAgent.rank === "Senior" ? "dev" : "general";

      addMessage({
        agentId: randomAgent.id,
        agentName: randomAgent.name,
        agentEmoji: randomAgent.emoji,
        agentColor: randomAgent.body,
        channel,
        content,
        type: "chat",
      });
    }, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, [addMessage]);

  // React to project count changes (new project added)
  useEffect(() => {
    if (lastProjectCount.current === 0) { lastProjectCount.current = projects.length; return; }
    if (projects.length > lastProjectCount.current) {
      const newest = projects[0];
      const lead = AGENTS.find(a => a.rank === "Lead");
      if (lead && newest) {
        const content = `📁 새 프로젝트 "${newest.name}" 등록됨. 담당 배정 및 초기 계획 수립 시작합니다.`;
        postMessage({
          agentId: lead.id,
          agentName: lead.name,
          agentEmoji: lead.emoji,
          agentColor: lead.body,
          channel: "general",
          content,
          type: "chat",
        }, true);
      }
    }
    lastProjectCount.current = projects.length;
  }, [projects.length]);

  // React to task completions and progress changes
  useEffect(() => {
    const prev = lastProjectRef.current;
    if (prev.length === 0) { lastProjectRef.current = projects; return; }

    projects.forEach(curr => {
      const old = prev.find(p => p.id === curr.id);
      if (!old) return;

      // Task completed
      const newDone = curr.tasks.filter(t => t.done).length;
      const oldDone = old.tasks.filter(t => t.done).length;
      if (newDone > oldDone && curr.assignedAgentId) {
        const agent = AGENT_MAP[curr.assignedAgentId];
        if (agent) {
          addMessage({
            agentId: agent.id,
            agentName: agent.name,
            agentEmoji: agent.emoji,
            agentColor: agent.body,
            channel: "dev",
            content: projectEventMsg(agent.id, "task_done", curr.name),
            type: "chat",
          });
        }
      }

      // Progress jumped by 10+
      if (curr.progress - old.progress >= 10 && curr.assignedAgentId) {
        const agent = AGENT_MAP[curr.assignedAgentId];
        if (agent) {
          addMessage({
            agentId: agent.id,
            agentName: agent.name,
            agentEmoji: agent.emoji,
            agentColor: agent.body,
            channel: "dev",
            content: projectEventMsg(agent.id, "progress_up", curr.name),
            type: "chat",
          });
        }
      }
    });

    lastProjectRef.current = projects;
  }, [projects]);

  // User can post as "me"
  const postAsMe = useCallback((content: string, channel: FeedChannel) => {
    const meStr = localStorage.getItem("phq_my_avatar");
    let name = "ME"; let emoji = "🧑"; let color = "#a78bfa";
    try {
      if (meStr) {
        const me = JSON.parse(meStr);
        name = me.name || "ME"; emoji = me.emoji || "🧑"; color = me.bodyColor || "#a78bfa";
      }
    } catch { /* ignore */ }
    addMessage({ agentId: "me", agentName: name, agentEmoji: emoji, agentColor: color, channel, content, type: "chat" });
  }, [addMessage]);

  // Send CEO announcement manually
  const postCEOAnnouncement = useCallback((content: string) => {
    const ceo = AGENTS.find(a => a.rank === "CEO");
    if (!ceo) return;
    postMessage({
      agentId: ceo.id,
      agentName: ceo.name,
      agentEmoji: ceo.emoji,
      agentColor: ceo.body,
      channel: "announcements",
      content: `📢 ${content}`,
      type: "announcement",
    }, true);
  }, [postMessage]);

  const clearFeed = useCallback(() => {
    setMessages([]);
    localStorage.removeItem(FEED_KEY);
  }, []);

  return { messages, postAsMe, postCEOAnnouncement, clearFeed };
}
