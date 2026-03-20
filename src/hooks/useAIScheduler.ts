import { useEffect, useCallback, useRef } from "react";
import type { Project, ToastItem } from "../types";

const API_KEY = (import.meta.env.VITE_OPENAI_API_KEY as string | undefined)?.trim();

type ToastFn = (msg: string, type?: ToastItem["type"], emoji?: string) => void;
type PushMsgFn = (msg: string) => void; // injects AI message into chat

function buildAnalysisPrompt(projects: Project[]): string {
  const today = new Date().toLocaleDateString("ko-KR", { month: "long", day: "numeric", weekday: "short" });
  const active = projects.filter(p => p.status === "active" || p.status === "pivot");
  const paused = projects.filter(p => p.status === "paused");

  const projectDetails = projects.map(p => {
    const daysSince = Math.floor((Date.now() - new Date(p.lastActivity).getTime()) / 864e5);
    const pendingTasks = p.tasks.filter(t => !t.done).map(t => t.text);
    return `- [${p.name}] 상태:${p.status} 우선순위:${p.priority} 진행률:${p.progress}% 방치:${daysSince}일 미완료태스크:${pendingTasks.length}건(${pendingTasks.slice(0, 3).join(", ")})`;
  }).join("\n");

  return `오늘은 ${today}입니다. 다음은 전체 프로젝트 현황입니다:

${projectDetails}

활성 ${active.length}개 / 중단 ${paused.length}개 / 전체 ${projects.length}개

당신은 AI 프로젝트 매니저입니다. 위 데이터를 분석해서:

1. **오늘 집중해야 할 프로젝트 TOP 3** (이유 포함, 구체적 다음 행동 1가지씩)
2. **주의가 필요한 프로젝트** (방치 중이거나 막힌 것)
3. **서버/배포 상태 체크 필요 여부**
4. **한 줄 오늘의 목표**

간결하고 실용적으로, 한국어로 답변하세요. 총 10줄 이내.`;
}

export function useAIScheduler(
  projects: Project[],
  pushAIMessage: PushMsgFn,
  toast: ToastFn,
) {
  const ranRef = useRef(false);

  const runAnalysis = useCallback(async () => {
    if (!API_KEY || !projects.length) return;

    try {
      const res = await fetch("https://api.openai.com/v1/chat/completions", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${API_KEY}` },
        body: JSON.stringify({
          model: "gpt-4o-mini",
          max_tokens: 500,
          messages: [{ role: "user", content: buildAnalysisPrompt(projects) }],
        }),
      });
      if (!res.ok) return;
      const data = await res.json() as { choices: [{ message: { content: string } }] };
      const reply = data.choices[0].message.content.trim();
      pushAIMessage(`📋 **오늘의 AI 브리핑**\n\n${reply}`);
    } catch {
      // silent fail — scheduler is non-critical
    }
  }, [projects, pushAIMessage]);

  // Auto-run once when projects are loaded
  useEffect(() => {
    if (ranRef.current || projects.length === 0) return;
    ranRef.current = true;
    // Small delay so app finishes rendering first
    const t = setTimeout(() => {
      runAnalysis();
      toast("AI가 프로젝트를 분석했습니다", "success", "🤖");
    }, 2000);
    return () => clearTimeout(t);
  }, [projects.length]);

  return { runAnalysis };
}
