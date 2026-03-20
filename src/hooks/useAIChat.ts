import { useState, useCallback } from "react";
import type { Project, ToastItem } from "../types";

const API_KEY = (import.meta.env.VITE_OPENAI_API_KEY as string | undefined)?.trim();

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
];

function systemPrompt(projects: Project[]): string {
  const list = projects.map(p =>
    `[ID:${p.id}] ${p.name} | ${p.status} | 진행률:${p.progress}% | 방:${p.room} | 태스크:${p.tasks.map(t => `${t.id}(${t.done ? "✓" : "✗"}${t.text})`).join(",")}`
  ).join("\n");

  return `당신은 Pixel Project HQ의 AI 프로젝트 매니저입니다.
도구를 사용해 프로젝트를 직접 관리하고, 한국어로 간결하게 답변하세요.

현재 프로젝트 목록:
${list || "프로젝트 없음"}

지시사항:
- 프로젝트 이름으로 검색해서 ID를 찾아 도구 사용
- 여러 작업은 한 번에 처리
- 완료 후 무엇을 했는지 짧게 보고`;
}

export function useAIChat(projects: Project[], handlers: ProjectHandlers, toast: ToastFn) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [loading, setLoading] = useState(false);

  const pushAIMessage = useCallback((content: string) => {
    setMessages(prev => [...prev, { role: "assistant", content }]);
  }, []);

  const send = useCallback(async (text: string) => {
    if (!API_KEY) {
      setMessages(prev => [...prev, { role: "assistant", content: "⚠️ OpenAI API 키가 없습니다. .env 파일에 VITE_OPENAI_API_KEY를 설정하고 dev 서버를 재시작하세요." }]);
      setLoading(false);
      return;
    }
    if (!text.trim()) return;

    const userMsg: ChatMessage = { role: "user", content: text };
    setMessages(prev => [...prev, userMsg]);
    setLoading(true);

    try {
      const history = [...messages, userMsg].map(m => ({ role: m.role, content: m.content }));

      // 1st call — may return tool_calls
      const res = await fetch("https://api.openai.com/v1/chat/completions", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${API_KEY}` },
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
          const args = JSON.parse(call.function.arguments) as Record<string, unknown>;
          let result = "완료";

          if (call.function.name === "update_project") {
            const { id, ...fields } = args as { id: number } & Partial<Project>;
            handlers.updateProject(id, fields);
          } else if (call.function.name === "add_task") {
            const { project_id, text: taskText } = args as { project_id: number; text: string };
            handlers.addTask(project_id, taskText);
          } else if (call.function.name === "toggle_task") {
            const { project_id, task_id } = args as { project_id: number; task_id: string };
            handlers.toggleTask(project_id, task_id);
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
              tasks: [],
            });
          } else {
            result = "알 수 없는 도구";
          }

          toolResults.push({ role: "tool", tool_call_id: call.id, content: result });
        }

        // 2nd call — get final response after tool execution
        const res2 = await fetch("https://api.openai.com/v1/chat/completions", {
          method: "POST",
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${API_KEY}` },
          body: JSON.stringify({
            model: "gpt-4o-mini",
            max_tokens: 300,
            messages: [
              { role: "system", content: systemPrompt(projects) },
              ...history,
              { role: "assistant", content: assistantMsg.content, tool_calls: toolCalls },
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
