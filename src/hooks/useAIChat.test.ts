import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import type { Project } from "../types";

// API 키 모킹
vi.mock("../hooks/useAIChat", async () => {
  const actual = await vi.importActual<typeof import("./useAIChat")>("../hooks/useAIChat");
  return actual;
});

// import.meta.env 모킹
vi.stubEnv("VITE_OPENAI_API_KEY", "test-key");

import { useAIChat } from "./useAIChat";

const sampleProject: Project = {
  id: 1, name: "테스트 프로젝트", status: "active", priority: "high",
  progress: 50, lastActivity: "2024-01-01", room: "lab",
  serverUrl: null, githubUrl: null, thumbnail: null,
  description: null, featured: false, startDate: null, endDate: null, assignedAgentId: null, budget: null, targetDate: null,
  stack: ["React"], tasks: [{ id: "t1", text: "작업1", done: false }],
};

const mockHandlers = {
  updateProject: vi.fn(),
  addProject: vi.fn(),
  deleteProject: vi.fn(),
  toggleTask: vi.fn(),
  addTask: vi.fn(),
};

const mockToast = vi.fn();

function makeFetchMock(response: unknown, ok = true) {
  return vi.fn().mockResolvedValue({
    ok,
    status: ok ? 200 : 500,
    json: async () => response,
  });
}

describe("useAIChat", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("초기 상태는 빈 메시지, loading false", () => {
    const { result } = renderHook(() =>
      useAIChat([sampleProject], mockHandlers, mockToast)
    );
    expect(result.current.messages).toHaveLength(0);
    expect(result.current.loading).toBe(false);
  });

  it("clear()는 messages를 비운다", async () => {
    global.fetch = makeFetchMock({
      choices: [{ message: { role: "assistant", content: "안녕!", tool_calls: undefined }, finish_reason: "stop" }],
    });

    const { result } = renderHook(() =>
      useAIChat([sampleProject], mockHandlers, mockToast)
    );

    await act(async () => { await result.current.send("안녕"); });
    expect(result.current.messages.length).toBeGreaterThan(0);

    act(() => { result.current.clear(); });
    expect(result.current.messages).toHaveLength(0);
  });

  it("빈 텍스트는 전송하지 않는다", async () => {
    global.fetch = vi.fn();
    const { result } = renderHook(() =>
      useAIChat([sampleProject], mockHandlers, mockToast)
    );
    await act(async () => { await result.current.send("   "); });
    expect(global.fetch).not.toHaveBeenCalled();
    expect(result.current.messages).toHaveLength(0);
  });

  it("API 오류 시 에러 메시지와 toast 출력", async () => {
    global.fetch = makeFetchMock({ error: "bad" }, false);

    const { result } = renderHook(() =>
      useAIChat([sampleProject], mockHandlers, mockToast)
    );
    await act(async () => { await result.current.send("안녕"); });

    const lastMsg = result.current.messages[result.current.messages.length - 1];
    expect(lastMsg?.content).toContain("오류");
    expect(mockToast).toHaveBeenCalledWith("AI 오류", "error", "⚠️");
    expect(result.current.loading).toBe(false);
  });

  it("일반 응답 시 assistant 메시지 추가", async () => {
    global.fetch = makeFetchMock({
      choices: [{ message: { role: "assistant", content: "처리 완료!", tool_calls: undefined }, finish_reason: "stop" }],
    });

    const { result } = renderHook(() =>
      useAIChat([sampleProject], mockHandlers, mockToast)
    );
    await act(async () => { await result.current.send("상태 알려줘"); });

    expect(result.current.messages).toHaveLength(2);
    expect(result.current.messages[0]).toEqual({ role: "user", content: "상태 알려줘" });
    expect(result.current.messages[1]).toEqual({ role: "assistant", content: "처리 완료!" });
    expect(result.current.loading).toBe(false);
  });

  it("tool_call: update_project 실행", async () => {
    global.fetch = vi.fn()
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          choices: [{
            message: {
              role: "assistant",
              content: null,
              tool_calls: [{
                id: "call_1",
                function: { name: "update_project", arguments: JSON.stringify({ id: 1, status: "complete" }) },
              }],
            },
            finish_reason: "tool_calls",
          }],
        }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          choices: [{ message: { content: "업데이트 완료!" } }],
        }),
      });

    const { result } = renderHook(() =>
      useAIChat([sampleProject], mockHandlers, mockToast)
    );
    await act(async () => { await result.current.send("완료로 바꿔줘"); });

    expect(mockHandlers.updateProject).toHaveBeenCalledWith(1, { status: "complete" });
    const lastMsg = result.current.messages[result.current.messages.length - 1];
    expect(lastMsg?.content).toBe("업데이트 완료!");
  });

  it("tool_call: add_task 실행", async () => {
    global.fetch = vi.fn()
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          choices: [{
            message: {
              role: "assistant", content: null,
              tool_calls: [{
                id: "call_2",
                function: { name: "add_task", arguments: JSON.stringify({ project_id: 1, text: "새 태스크" }) },
              }],
            },
            finish_reason: "tool_calls",
          }],
        }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ choices: [{ message: { content: "태스크 추가됨" } }] }),
      });

    const { result } = renderHook(() =>
      useAIChat([sampleProject], mockHandlers, mockToast)
    );
    await act(async () => { await result.current.send("태스크 추가해줘"); });

    expect(mockHandlers.addTask).toHaveBeenCalledWith(1, "새 태스크");
  });

  it("tool_call: toggle_task 실행", async () => {
    global.fetch = vi.fn()
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          choices: [{
            message: {
              role: "assistant", content: null,
              tool_calls: [{
                id: "call_3",
                function: { name: "toggle_task", arguments: JSON.stringify({ project_id: 1, task_id: "t1" }) },
              }],
            },
            finish_reason: "tool_calls",
          }],
        }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ choices: [{ message: { content: "토글 완료" } }] }),
      });

    const { result } = renderHook(() =>
      useAIChat([sampleProject], mockHandlers, mockToast)
    );
    await act(async () => { await result.current.send("t1 완료 처리해줘"); });

    expect(mockHandlers.toggleTask).toHaveBeenCalledWith(1, "t1");
  });

  it("tool_call: create_project 실행", async () => {
    global.fetch = vi.fn()
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          choices: [{
            message: {
              role: "assistant", content: null,
              tool_calls: [{
                id: "call_4",
                function: { name: "create_project", arguments: JSON.stringify({ name: "신규 프로젝트" }) },
              }],
            },
            finish_reason: "tool_calls",
          }],
        }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ choices: [{ message: { content: "프로젝트 생성됨" } }] }),
      });

    const { result } = renderHook(() =>
      useAIChat([sampleProject], mockHandlers, mockToast)
    );
    await act(async () => { await result.current.send("새 프로젝트 만들어줘"); });

    expect(mockHandlers.addProject).toHaveBeenCalledOnce();
    const created = mockHandlers.addProject.mock.calls[0][0] as Project;
    expect(created.name).toBe("신규 프로젝트");
    expect(created.status).toBe("active");
    expect(created.tasks).toHaveLength(0);
  });

  it("tool_call arguments JSON 파싱 오류 시 크래시 없이 계속 진행", async () => {
    global.fetch = vi.fn()
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          choices: [{
            message: {
              role: "assistant", content: null,
              tool_calls: [{
                id: "call_bad",
                function: { name: "update_project", arguments: "{ invalid json" },
              }],
            },
            finish_reason: "tool_calls",
          }],
        }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ choices: [{ message: { content: "완료" } }] }),
      });

    const { result } = renderHook(() =>
      useAIChat([sampleProject], mockHandlers, mockToast)
    );

    // 크래시 없이 완료되어야 함
    await act(async () => { await result.current.send("업데이트"); });
    expect(mockHandlers.updateProject).not.toHaveBeenCalled();
    expect(result.current.loading).toBe(false);
  });

  it("pushAIMessage는 assistant 메시지를 직접 추가한다", () => {
    const { result } = renderHook(() =>
      useAIChat([sampleProject], mockHandlers, mockToast)
    );
    act(() => { result.current.pushAIMessage("직접 메시지"); });
    expect(result.current.messages).toHaveLength(1);
    expect(result.current.messages[0]).toEqual({ role: "assistant", content: "직접 메시지" });
  });
});
