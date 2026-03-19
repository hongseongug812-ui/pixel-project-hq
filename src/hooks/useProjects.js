import { useState, useCallback } from "react";
import { isConfigured } from "../lib/supabase";
import * as db from "../lib/db";

const KEY = "phq6";
const loadLocal = () => { try { return JSON.parse(localStorage.getItem(KEY) || "[]"); } catch { return []; } };
const saveLocal = (p) => localStorage.setItem(KEY, JSON.stringify(p));

export function useProjects(user, pushLog) {
  const [projects, setProjects] = useState([]);
  const [loadingData, setLoadingData] = useState(true);
  const [saving, setSaving] = useState(false);

  const loadProjects = useCallback(async () => {
    setLoadingData(true);
    if (isConfigured && user) {
      try {
        const data = await db.fetchProjects(user.id);
        setProjects(data);
      } catch (e) {
        pushLog(`DB 로드 오류: ${e.message}`, "❌", "#ef4444");
        setProjects(loadLocal());
      }
    } else {
      setProjects(loadLocal());
    }
    setLoadingData(false);
  }, [user, pushLog]);

  const syncLocal = useCallback((list) => {
    if (!isConfigured || !user) saveLocal(list);
  }, [user]);

  const addProject = useCallback(async (pr) => {
    if (isConfigured && user) {
      setSaving(true);
      try {
        const created = await db.createProject(pr, user.id);
        setProjects(p => [created, ...p]);
        pushLog(`프로젝트 등록: ${created.name}`, "🆕", "#4ade80");
      } catch (e) {
        pushLog(`저장 실패: ${e.message}`, "❌", "#ef4444");
      } finally {
        setSaving(false);
      }
    } else {
      const local = { ...pr, id: Date.now() };
      setProjects(p => [local, ...p]);
      pushLog(`프로젝트 등록: ${local.name}`, "🆕", "#4ade80");
    }
  }, [user, pushLog]);

  const deleteProject = useCallback(async (id) => {
    setProjects(p => p.filter(x => x.id !== id));
    if (isConfigured && user) {
      try { await db.deleteProject(id); }
      catch (e) { pushLog(`삭제 실패: ${e.message}`, "❌", "#ef4444"); }
    }
  }, [user, pushLog]);

  const updateProject = useCallback(async (id, fields) => {
    setProjects(p => p.map(x => x.id === id ? { ...x, ...fields } : x));
    if (isConfigured && user) {
      try { await db.updateProject(id, fields); }
      catch (e) { pushLog(`업데이트 실패: ${e.message}`, "❌", "#ef4444"); }
    }
  }, [user, pushLog]);

  const toggleTask = useCallback((pid, tid) => {
    setProjects(p => p.map(pr => {
      if (pr.id !== pid) return pr;
      const nt = pr.tasks.map(t => t.id === tid ? { ...t, done: !t.done } : t);
      const updated = {
        ...pr, tasks: nt,
        progress: Math.round(nt.filter(t => t.done).length / Math.max(nt.length, 1) * 100),
        lastActivity: new Date().toISOString().slice(0, 10),
      };
      if (isConfigured && user) db.updateProject(pid, { tasks: nt, progress: updated.progress, lastActivity: updated.lastActivity }).catch(() => {});
      return updated;
    }));
  }, [user]);

  const addTask = useCallback((pid, text) => {
    setProjects(p => p.map(pr => {
      if (pr.id !== pid) return pr;
      const nt = [...pr.tasks, { id: `t${Date.now()}`, text, done: false }];
      const updated = { ...pr, tasks: nt, lastActivity: new Date().toISOString().slice(0, 10) };
      if (isConfigured && user) db.updateProject(pid, { tasks: nt, lastActivity: updated.lastActivity }).catch(() => {});
      return updated;
    }));
  }, [user]);

  return { projects, setProjects, loadingData, saving, loadProjects, syncLocal, addProject, deleteProject, updateProject, toggleTask, addTask };
}
