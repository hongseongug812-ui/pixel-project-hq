import { useState, useCallback } from "react";
import * as db from "../lib/db";
import { readStorage, isObjectArray } from "../utils/storage";
import type { Project, ToastItem } from "../types";

type ToastFn = (msg: string, type?: ToastItem["type"], emoji?: string) => void;
type PushLogFn = (msg: string, emoji?: string, color?: string) => void;

const KEY = "phq6";

export function useMigration(
  user: { id: string } | null,
  setProjects: (fn: (p: Project[]) => Project[]) => void,
  toast: ToastFn,
  pushLog: PushLogFn,
) {
  const [migrateBanner, setMigrateBanner] = useState(false);

  const checkLocalData = useCallback(() => {
    const local = readStorage(KEY, isObjectArray, []);
    if (local.length > 0) setMigrateBanner(true);
  }, []);

  const handleMigrate = useCallback(async () => {
    if (!user) return;
    const count = await db.migrateFromLocalStorage(user.id);
    if (count > 0) {
      const refreshed = await db.fetchProjects(user.id);
      setProjects(() => refreshed);
      toast(`로컬 데이터 ${count}개 가져오기 완료`, "success", "📦");
      pushLog(`로컬 데이터 ${count}개 마이그레이션 완료`, "📦", "#4ade80");
    }
    setMigrateBanner(false);
  }, [user, setProjects, toast, pushLog]);

  const dismissMigrate = useCallback(() => {
    setMigrateBanner(false);
    localStorage.removeItem(KEY);
  }, []);

  return { migrateBanner, checkLocalData, handleMigrate, dismissMigrate };
}
