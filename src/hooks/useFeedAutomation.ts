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
import { loadUserSettings } from "../components/MyPage";
import { sendDiscord } from "../utils/discord";
import { usePageVisible } from "./usePageVisible";
import type { Project } from "../types";
import type { FeedMessage, FeedChannel } from "./useCompanyFeed";

type AddMsgFn    = (msg: Omit<FeedMessage, "id" | "timestamp">) => FeedMessage;
type PostMsgFn   = (msg: Omit<FeedMessage, "id" | "timestamp">, toDiscord?: boolean) => FeedMessage;

const AGENT_MAP = Object.fromEntries(AGENTS.map(a => [a.id, a]));
const AGENT_ACTIVITY_INTERVAL_MS = 5 * 60 * 1000; // 5분

const CEO_ANNOUNCEMENTS: Array<(active: number, total: number) => string> = [
  (active, total) => `📢 전 직원 여러분, 오늘도 힘차게 시작합시다. 현재 ${active}개 프로젝트 활성화, 총 ${total}개 운영 중입니다.`,
  (active)        => `📢 오늘 우선순위: 활성 프로젝트 ${active}건 집중 진행. 블로커 발생 시 즉시 에스컬레이션 바랍니다.`,
  (active, total) => `📢 주간 목표 점검. 총 ${total}건 중 ${active}건 진행 중. 마감 임박 프로젝트 우선 처리 부탁드립니다.`,
];

const AGENT_REACTIONS: Record<string, string[]> = {
  CTO:       ["기술 스택 검토가 필요한 항목이 있습니다. 아키텍처 회의 잡겠습니다.", "코드 품질 기준 상향 검토 중입니다. PR 리뷰 강화 예정.", "인프라 현황 파악 완료. 최적화 포인트 3개 발견했습니다."],
  Lead:      ["팀 조율 사항 공유드립니다. 오늘 스탠드업 11시로 조정.", "스프린트 플래닝 진행 중. 백로그 정리 협조 부탁드립니다.", "협업 이슈 있는 분 DM 주세요. 같이 해결해봅시다."],
  Senior:    ["개발 완료한 기능 QA 요청드립니다.", "리팩토링 작업 진행 중. 성능 20% 개선 예상됩니다.", "버그 수정 완료. 테스트 커버리지 높였습니다."],
  Junior:    ["열심히 배우면서 작업 중입니다! 막히는 부분 있으면 도움 요청하겠습니다 💪", "새로운 기능 개발 시작했습니다. 피드백 주시면 반영할게요!", "문서화 작업 병행 중입니다. 나중에 팀에 공유할게요!"],
  Assistant: ["업무 지원 준비 완료! 필요한 거 있으시면 말씀해주세요.", "미팅 자료 정리 완료했습니다. 공유 드릴까요?", "일정 조율 및 리마인더 세팅 완료."],
};

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
    function onFeedEvent(e: Event) {
      const { agentId, content, channel } = (e as CustomEvent<{ agentId: string; content: string; channel: string }>).detail;
      const agent = AGENT_MAP[agentId];
      if (!agent) return;
      addMessage({ agentId: agent.id, agentName: agent.name, agentEmoji: agent.emoji, agentColor: agent.body, channel: (channel as FeedChannel) ?? "general", content, type: "alert" });
    }
    window.addEventListener("phq-feed", onFeedEvent);
    return () => window.removeEventListener("phq-feed", onFeedEvent);
  }, [addMessage]);
}
