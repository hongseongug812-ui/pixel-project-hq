import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useUndoDelete } from "./useUndoDelete";
import type { Project, ToastItem } from "../types";

const mockProject: Project = {
  id: 1, name: "삭제 테스트", status: "active", priority: "high",
  progress: 50, lastActivity: "2024-01-01", room: "lab",
  serverUrl: null, githubUrl: null, thumbnail: null,
  description: null, featured: false, startDate: null, endDate: null,
  stack: [], tasks: [],
};

type ToastFn = (msg: string, type?: "success" | "warn" | "error", emoji?: string) => void;
type SetToastsFn = (fn: (p: ToastItem[]) => ToastItem[]) => void;

describe("useUndoDelete", () => {
  let deleteProjectMock: ReturnType<typeof vi.fn>;
  let addProjectMock: ReturnType<typeof vi.fn>;
  let setToastsMock: ReturnType<typeof vi.fn>;
  let toastMock: ReturnType<typeof vi.fn>;
  let setSelIdMock: ReturnType<typeof vi.fn>;

  let deleteProject: (id: number | string) => void;
  let addProject: (p: Project) => void;
  let setToasts: SetToastsFn;
  let toast: ToastFn;
  let setSelId: (id: null) => void;

  beforeEach(() => {
    vi.useFakeTimers();
    deleteProjectMock = vi.fn();
    addProjectMock = vi.fn();
    setToastsMock = vi.fn();
    toastMock = vi.fn();
    setSelIdMock = vi.fn();
    deleteProject = deleteProjectMock as unknown as (id: number | string) => void;
    addProject = addProjectMock as unknown as (p: Project) => void;
    setToasts = setToastsMock as unknown as SetToastsFn;
    toast = toastMock as unknown as ToastFn;
    setSelId = setSelIdMock as unknown as (id: null) => void;
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("handleDelete calls deleteProject with the id", () => {
    const { result } = renderHook(() =>
      useUndoDelete([mockProject], deleteProject, addProject, setToasts, toast, setSelId)
    );
    act(() => { result.current.handleDelete(1); });
    expect(deleteProjectMock).toHaveBeenCalledWith(1);
  });

  it("handleDelete sets selId to null", () => {
    const { result } = renderHook(() =>
      useUndoDelete([mockProject], deleteProject, addProject, setToasts, toast, setSelId)
    );
    act(() => { result.current.handleDelete(1); });
    expect(setSelIdMock).toHaveBeenCalledWith(null);
  });

  it("handleDelete adds a warn toast with the project name", () => {
    const { result } = renderHook(() =>
      useUndoDelete([mockProject], deleteProject, addProject, setToasts, toast, setSelId)
    );
    act(() => { result.current.handleDelete(1); });
    expect(setToastsMock).toHaveBeenCalled();
    const updater = setToastsMock.mock.calls[0][0] as (p: ToastItem[]) => ToastItem[];
    const toasts: ToastItem[] = updater([]);
    expect(toasts[0].msg).toContain("삭제 테스트");
    expect(toasts[0].type).toBe("warn");
  });

  it("handleDelete does nothing if project not found", () => {
    const { result } = renderHook(() =>
      useUndoDelete([mockProject], deleteProject, addProject, setToasts, toast, setSelId)
    );
    act(() => { result.current.handleDelete(999); });
    expect(deleteProjectMock).not.toHaveBeenCalled();
  });

  it("handleUndo calls addProject with the deleted project", () => {
    const { result } = renderHook(() =>
      useUndoDelete([mockProject], deleteProject, addProject, setToasts, toast, setSelId)
    );
    act(() => { result.current.handleDelete(1); });
    const updater = setToastsMock.mock.calls[0][0] as (p: ToastItem[]) => ToastItem[];
    const createdToasts: ToastItem[] = updater([]);
    const undoId = createdToasts[0].undoId!;
    act(() => { result.current.handleUndo(undoId); });
    expect(addProjectMock).toHaveBeenCalledWith(mockProject);
  });

  it("handleUndo calls toast with success message", () => {
    const { result } = renderHook(() =>
      useUndoDelete([mockProject], deleteProject, addProject, setToasts, toast, setSelId)
    );
    act(() => { result.current.handleDelete(1); });
    const updater = setToastsMock.mock.calls[0][0] as (p: ToastItem[]) => ToastItem[];
    const createdToasts: ToastItem[] = updater([]);
    const undoId = createdToasts[0].undoId!;
    act(() => { result.current.handleUndo(undoId); });
    expect(toastMock).toHaveBeenCalledWith("삭제 취소됨", "success", "↩");
  });

  it("handleUndo does nothing with wrong undoId", () => {
    const { result } = renderHook(() =>
      useUndoDelete([mockProject], deleteProject, addProject, setToasts, toast, setSelId)
    );
    act(() => { result.current.handleDelete(1); });
    act(() => { result.current.handleUndo(99999); });
    expect(addProjectMock).not.toHaveBeenCalled();
  });

  it("toast is removed after 5 seconds", () => {
    const { result } = renderHook(() =>
      useUndoDelete([mockProject], deleteProject, addProject, setToasts, toast, setSelId)
    );
    act(() => { result.current.handleDelete(1); });
    expect(setToastsMock).toHaveBeenCalledTimes(1);
    act(() => { vi.advanceTimersByTime(5000); });
    expect(setToastsMock).toHaveBeenCalledTimes(2);
  });
});
