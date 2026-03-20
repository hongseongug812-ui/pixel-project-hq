import { useState, useCallback } from "react";
import type { ToastItem } from "../types";

export function useToast() {
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  const toast = useCallback((msg: string, type: ToastItem["type"] = "success", emoji = "✓") => {
    const id = Date.now();
    setToasts(p => [...p.slice(-4), { id, msg, type, emoji }]);
    setTimeout(() => setToasts(p => p.filter(t => t.id !== id)), 3000);
  }, []);

  return { toasts, setToasts, toast };
}
