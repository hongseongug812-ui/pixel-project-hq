import { useState, useCallback } from "react";
import { isConfigured } from "../lib/supabase";
import * as db from "../lib/db";
import { useLogs } from "../contexts/LogsContext";
import type { Project, ToastItem } from "../types";

const KEY = "phq6";
const saveLocal = (p: Project[]): void => localStorage.setItem(KEY, JSON.stringify(p));

type ToastFn = (msg: string, type?: ToastItem["type"], emoji?: string) => void;

export function useProjects(user: { id: string } | null, toast?: ToastFn) {
  const { pushLog } = useLogs();
  const [projects, setProjects] = useState<Project[]>([]);
  const [loadingData, setLoadingData] = useState(true);
  const [saving, setSaving] = useState(false);

  const loadProjects = useCallback(async () => {
    setLoadingData(true);
    if (isConfigured && user) {
      try {
        const data = await db.fetchProjects(user.id);
        setProjects(data);
      } catch (e) {
        pushLog(`DB 로드 오류: ${(e as Error).message}`, "❌", "#ef4444");
        toast?.("클라우드 연결 실패 — 로컬 데이터로 복구했습니다", "warn", "☁️");
        try { setProjects(JSON.parse(localStorage.getItem(KEY) || "[]")); } catch { setProjects([]); }
      }
    } else {
      try { setProjects(JSON.parse(localStorage.getItem(KEY) || "[]")); } catch { setProjects([]); }
    }
    setLoadingData(false);
  }, [user, pushLog]);

  const syncLocal = useCallback((list: Project[]) => {
    if (!isConfigured || !user) saveLocal(list);
  }, [user]);

  const addProject = useCallback(async (pr: Project) => {
    if (isConfigured && user) {
      setSaving(true);
      try {
        const created = await db.createProject(pr, user.id);
        setProjects(p => [created, ...p]);
        pushLog(`프로젝트 등록: ${created.name}`, "🆕", "#4ade80");
      } catch (e) {
        pushLog(`저장 실패: ${(e as Error).message}`, "❌", "#ef4444");
        toast?.("프로젝트 저장 실패 — 클라우드에 동기화되지 않았습니다", "error", "❌");
      } finally {
        setSaving(false);
      }
    } else {
      const local: Project = { ...pr, id: Date.now() };
      setProjects(p => [local, ...p]);
      pushLog(`프로젝트 등록: ${local.name}`, "🆕", "#4ade80");
    }
  }, [user, pushLog]);

  const deleteProject = useCallback(async (id: string | number) => {
    setProjects(p => p.filter(x => x.id !== id));
    if (isConfigured && user) {
      try { await db.deleteProject(id); }
      catch (e) { pushLog(`삭제 실패: ${(e as Error).message}`, "❌", "#ef4444"); }
    }
  }, [user, pushLog]);

  const updateProject = useCallback(async (id: string | number, fields: Partial<Project>) => {
    setProjects(p => p.map(x => x.id === id ? { ...x, ...fields } : x));
    if (isConfigured && user) {
      try { await db.updateProject(id, fields); }
      catch (e) {
        pushLog(`업데이트 실패: ${(e as Error).message}`, "❌", "#ef4444");
        toast?.("업데이트 동기화 실패", "warn", "⚠️");
      }
    }
  }, [user, pushLog]);

  const toggleTask = useCallback((pid: string | number, tid: string) => {
    setProjects(p => p.map(pr => {
      if (pr.id !== pid) return pr;
      const nt = pr.tasks.map(t => t.id === tid ? { ...t, done: !t.done } : t);
      const updated: Project = {
        ...pr, tasks: nt,
        progress: Math.round(nt.filter(t => t.done).length / Math.max(nt.length, 1) * 100),
        lastActivity: new Date().toISOString().slice(0, 10),
      };
      if (isConfigured && user) {
        db.updateProject(pid, { tasks: nt, progress: updated.progress, lastActivity: updated.lastActivity })
          .catch(e => pushLog(`태스크 업데이트 실패: ${(e as Error).message}`, "❌", "#ef4444"));
      }
      return updated;
    }));
  }, [user, pushLog]);

  const addTask = useCallback((pid: string | number, text: string) => {
    setProjects(p => p.map(pr => {
      if (pr.id !== pid) return pr;
      const nt = [...pr.tasks, { id: `t${Date.now()}`, text, done: false }];
      const updated: Project = { ...pr, tasks: nt, lastActivity: new Date().toISOString().slice(0, 10) };
      if (isConfigured && user) {
        db.updateProject(pid, { tasks: nt, lastActivity: updated.lastActivity })
          .catch(e => pushLog(`태스크 추가 실패: ${(e as Error).message}`, "❌", "#ef4444"));
      }
      return updated;
    }));
  }, [user, pushLog]);

  return { projects, setProjects, loadingData, saving, loadProjects, syncLocal, addProject, deleteProject, updateProject, toggleTask, addTask };
}
