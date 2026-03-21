import { useState, useCallback, useEffect, useRef } from "react";
import { makeRateLimiter } from "../utils/security";
import { AGENTS } from "../data/constants";
import type { Project, ToastItem } from "../types";

const MAX_MSG_LENGTH = 1000;
const RATE_LIMIT_MS  = 1500; // 1.5초 쿨다운

// 프록시 경로: dev → vite.config.js 미들웨어, prod → api/openai.ts Edge Function
const OPENAI_PROXY = "/api/openai";

export interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

type ToastFn = (msg: string, type?: ToastItem["type"], emoji?: string) => void;

interface ProjectHandlers {
  updateProject: (id: number | string, fields: Partial<Project>) => void;
  addProject: (p: Project) => void;
  deleteProject: (id: number | string) => void;
  toggleTask: (pid: number | string, tid: string) => void;
  addTask: (pid: number | string, text: string) => void;
}

const TOOLS = [
  {
    type: "function",
    function: {
      name: "update_project",
      description: "프로젝트의 상태, 진행률, 우선순위, 방 등을 수정",
      parameters: {
        type: "object",
        properties: {
          id: { type: "number", description: "프로젝트 ID" },
          status: { type: "string", enum: ["active", "pivot", "complete", "paused"] },
          progress: { type: "number", minimum: 0, maximum: 100 },
          priority: { type: "string", enum: ["high", "medium", "low"] },
          room: { type: "string", enum: ["lab", "office", "server", "ceo", "lounge", "meeting", "storage"] },
          name: { type: "string" },
          description: { type: "string" },
        },
        required: ["id"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "add_task",
      description: "프로젝트에 새 태스크 추가",
      parameters: {
        type: "object",
        properties: {
          project_id: { type: "number", description: "프로젝트 ID" },
          text: { type: "string", description: "태스크 내용" },
        },
        required: ["project_id", "text"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "toggle_task",
      description: "태스크 완료/미완료 토글",
      parameters: {
        type: "object",
        properties: {
          project_id: { type: "number" },
          task_id: { type: "string" },
        },
        required: ["project_id", "task_id"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "create_project",
      description: "새 프로젝트 생성",
      parameters: {
        type: "object",
        properties: {
          name: { type: "string" },
          status: { type: "string", enum: ["active", "pivot", "complete", "paused"] },
          priority: { type: "string", enum: ["high", "medium", "low"] },
          room: { type: "string", enum: ["lab", "office", "server", "ceo", "lounge", "meeting", "storage"] },
          description: { type: "string" },
          stack: { type: "array", items: { type: "string" } },
        },
        required: ["name"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "delete_project",
      description: "프로젝트 삭제. 사용자가 명시적으로 삭제/제거/없애달라고 요청할 때만 사용.",
      parameters: {
        type: "object",
        properties: {
          id: { type: "number", description: "삭제할 프로젝트 ID" },
        },
        required: ["id"],
      },
    },
  },
];

function systemPrompt(projects: Project[]): string {
  const list = projects.map(p => {
    const doneTasks = p.tasks.filter(t => t.done).length;
    const parts = [
      `[ID:${p.id}] "${p.name}"`,
      `상태:${p.status}`, `진행률:${p.progress}%`,
      `우선순위:${p.priority ?? "없음"}`,
      `방:${p.room}`,
      p.targetDate ? `마감:${p.targetDate}` : null,
      p.budget ? `예산:${p.budget}만` : null,
      `태스크:${doneTasks}/${p.tasks.length}완료`,
      p.tasks.filter(t => !t.done).length > 0
        ? `미완료:[${p.tasks.filter(t => !t.done).map(t => `${t.id}:"${t.text}"`).join(",")}]`
        : null,
    ].filter(Boolean);
    return parts.join(" | ");
  }).join("\n");

  const roster = AGENTS.map(a =>
    `- ${a.emoji} ${a.name} [${a.rank}] (${a.aiModel}): ${a.personality}`
  ).join("\n");

  return `당신은 Pixel Project HQ의 AI 통합 관리 시스템입니다.
아래 AI 에이전트들이 이 회사에서 일하고 있으며, 각자의 계급과 성격에 맞게 판단하고 행동합니다.

=== AI 에이전트 로스터 ===
${roster}

=== 현재 프로젝트 목록 ===
${list || "프로젝트 없음"}

=== 핵심 행동 규칙 (반드시 준수) ===
1. 사용자가 무언가를 "해달라", "바꿔달라", "추가해달라", "처리해달라"고 요청하면 반드시 즉시 도구를 호출해 실행한다.
2. "나중에 처리하겠습니다", "후속 보고 드리겠습니다", "확인해보겠습니다" 같은 말만 하고 실제 도구를 호출하지 않는 것은 엄격히 금지된다.
3. 지시를 받은 즉시 해당 도구를 호출해 실행하고, 완료 후 무엇을 했는지 짧게 보고한다.
4. 여러 작업이 필요하면 도구를 여러 번 연속 호출해 한 번에 모두 처리한다.
5. 프로젝트 이름으로 ID를 찾아 도구를 사용한다.
6. 정보 조회나 요약 요청에만 도구 없이 텍스트로 응답한다.
7. 에이전트의 계급과 성격을 반영해 상황에 맞는 어조로 답변 (CEO는 전략적, 주니어는 실행 중심)`;
}

export function useAIChat(projects: Project[], handlers: ProjectHandlers, toast: ToastFn) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [loading, setLoading] = useState(false);
  const rateLimitRef    = useRef(makeRateLimiter(RATE_LIMIT_MS));
  const abortCtrlRef    = useRef<AbortController | null>(null);

  // 언마운트 시 진행 중인 fetch 취소
  useEffect(() => () => { abortCtrlRef.current?.abort(); }, []);

  const pushAIMessage = useCallback((content: string) => {
    setMessages(prev => [...prev, { role: "assistant", content }]);
  }, []);

  const send = useCallback(async (text: string) => {
    if (!text.trim()) return;
    if (text.length > MAX_MSG_LENGTH) {
      toast(`메시지는 ${MAX_MSG_LENGTH}자 이내로 입력하세요.`, "warn", "⚠️");
      return;
    }
    if (!rateLimitRef.current()) {
      toast("요청이 너무 빠릅니다. 잠시 후 다시 시도하세요.", "warn", "⏳");
      return;
    }

    const userMsg: ChatMessage = { role: "user", content: text };
    setMessages(prev => [...prev, userMsg]);
    setLoading(true);

    // 이전 요청 취소 후 새 컨트롤러 생성
    abortCtrlRef.current?.abort();
    const ctrl = new AbortController();
    abortCtrlRef.current = ctrl;

    try {
      const history = [...messages, userMsg].map(m => ({ role: m.role, content: m.content }));

      // 1st call — may return tool_calls
      const res = await fetch(OPENAI_PROXY, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        signal: ctrl.signal,
        body: JSON.stringify({
          model: "gpt-4o-mini",
          max_tokens: 600,
          messages: [{ role: "system", content: systemPrompt(projects) }, ...history],
          tools: TOOLS,
          tool_choice: "auto",
        }),
      });

      if (!res.ok) throw new Error(`API 오류 (${res.status})`);
      const data = await res.json() as {
        choices: [{
          message: {
            role: string;
            content: string | null;
            tool_calls?: { id: string; function: { name: string; arguments: string } }[];
          };
          finish_reason: string;
        }];
      };

      const assistantMsg = data.choices[0].message;
      const toolCalls = assistantMsg.tool_calls;

      // Execute tools
      const toolResults: { role: string; tool_call_id: string; content: string }[] = [];
      if (toolCalls?.length) {
        for (const call of toolCalls) {
          let args: Record<string, unknown>;
          try {
            args = JSON.parse(call.function.arguments) as Record<string, unknown>;
          } catch {
            toolResults.push({ role: "tool", tool_call_id: call.id, content: "인수 파싱 오류" });
            continue;
          }
          let result = "완료";

          if (call.function.name === "update_project") {
            const { id, ...fields } = args as { id: number } & Partial<Project>;
            if (!projects.find(p => p.id === id)) { result = `프로젝트 ID:${id} 존재하지 않음`; }
            else { handlers.updateProject(id, fields); }
          } else if (call.function.name === "add_task") {
            const { project_id, text: taskText } = args as { project_id: number; text: string };
            if (!projects.find(p => p.id === project_id)) { result = `프로젝트 ID:${project_id} 존재하지 않음`; }
            else { handlers.addTask(project_id, taskText); }
          } else if (call.function.name === "toggle_task") {
            const { project_id, task_id } = args as { project_id: number; task_id: string };
            if (!projects.find(p => p.id === project_id)) { result = `프로젝트 ID:${project_id} 존재하지 않음`; }
            else { handlers.toggleTask(project_id, task_id); }
          } else if (call.function.name === "create_project") {
            const { name, status = "active", priority = "medium", room = "lab", description, stack = [] } = args as {
              name: string; status?: Project["status"]; priority?: Project["priority"];
              room?: Project["room"]; description?: string; stack?: string[];
            };
            handlers.addProject({
              id: Date.now(), name, status, priority, room,
              description: description ?? null, stack,
              progress: 0, lastActivity: new Date().toISOString().slice(0, 10),
              serverUrl: null, githubUrl: null, thumbnail: null,
              featured: false, startDate: new Date().toISOString().slice(0, 10), endDate: null,
              tasks: [], assignedAgentId: null, budget: null, targetDate: null,
            });
          } else if (call.function.name === "delete_project") {
            const { id } = args as { id: number };
            if (!projects.find(p => p.id === id)) { result = `프로젝트 ID:${id} 존재하지 않음`; }
            else { handlers.deleteProject(id); result = `프로젝트 ID:${id} 삭제 완료`; }
          } else {
            result = "알 수 없는 도구";
          }

          toolResults.push({ role: "tool", tool_call_id: call.id, content: result });
        }

        // 2nd call — get final response after tool execution
        const res2 = await fetch(OPENAI_PROXY, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          signal: ctrl.signal,
          body: JSON.stringify({
            model: "gpt-4o-mini",
            max_tokens: 300,
            messages: [
              { role: "system", content: systemPrompt(projects) + "\n\n지시사항을 모두 실행 완료했다. 실행한 내용만 짧게 보고하라. 추가 후속 조치가 필요하다는 말은 하지 마라." },
              ...history,
              { role: "assistant", content: assistantMsg.content ?? null, tool_calls: toolCalls },
              ...toolResults,
            ],
          }),
        });
        const data2 = await res2.json() as { choices: [{ message: { content: string } }] };
        const reply = data2.choices[0].message.content.trim();
        setMessages(prev => [...prev, { role: "assistant", content: reply }]);
      } else {
        const reply = (assistantMsg.content ?? "").trim();
        setMessages(prev => [...prev, { role: "assistant", content: reply }]);
      }
    } catch (e) {
      if ((e as Error).name === "AbortError") return; // unmount or re-send — silent
      const msg = (e as Error).message;
      setMessages(prev => [...prev, { role: "assistant", content: `오류: ${msg}` }]);
      toast("AI 오류", "error", "⚠️");
    } finally {
      setLoading(false);
    }
  }, [messages, projects, handlers, toast]);

  const clear = useCallback(() => setMessages([]), []);

  return { messages, loading, send, clear, pushAIMessage };
}
