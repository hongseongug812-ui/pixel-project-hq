import { useRef, useCallback } from "react";
import type { Project, ToastItem } from "../types";

type ToastFn = (msg: string, type?: ToastItem["type"], emoji?: string) => void;
type SetToastsFn = (fn: (p: ToastItem[]) => ToastItem[]) => void;

interface UndoRecord {
  id: number | string;
  project: Project;
  undoId: number;
}

export function useUndoDelete(
  projects: Project[],
  deleteProject: (id: number | string) => void,
  addProject: (p: Project) => void,
  setToasts: SetToastsFn,
  toast: ToastFn,
  setSelId: (id: null) => void,
) {
  const undoRef = useRef<UndoRecord | null>(null);

  const handleDelete = useCallback((id: number | string) => {
    const target = projects.find(p => p.id === id);
    if (!target) return;
    deleteProject(id);
    setSelId(null);
    const undoId = Date.now();
    undoRef.current = { id, project: target, undoId };
    const undoToast: ToastItem = { id: undoId, msg: `"${target.name}" 삭제됨`, type: "warn", emoji: "🗑", undoId };
    setToasts(p => [...p.slice(-4), undoToast]);
    setTimeout(() => {
      setToasts(p => p.filter(t => t.id !== undoId));
      undoRef.current = null;
    }, 5000);
  }, [projects, deleteProject, setSelId, setToasts]);

  const handleUndo = useCallback((undoId: number) => {
    if (!undoRef.current || undoRef.current.undoId !== undoId) return;
    addProject(undoRef.current.project);
    undoRef.current = null;
    setToasts(p => p.filter(t => t.id !== undoId));
    toast("삭제 취소됨", "success", "↩");
  }, [addProject, setToasts, toast]);

  return { handleDelete, handleUndo };
}
