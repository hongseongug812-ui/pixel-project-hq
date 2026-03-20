import { useEffect, useRef } from "react";
import { sendTelegram, isTelegramConfigured } from "../lib/telegram";
import type { Project } from "../types";

const DISCORD_WEBHOOK = (import.meta.env.VITE_DISCORD_WEBHOOK as string | undefined)?.trim();
const CHECK_INTERVAL  = 10 * 60 * 1000; // 10분마다 체크
const MAX_ALERTS_PER_CYCLE = 3;          // 회당 최대 알림 수
const MAX_FAILURES = 3;                  // 이 횟수 초과 실패 시 채널 비활성화

async function sendDiscord(text: string): Promise<boolean> {
  if (!DISCORD_WEBHOOK) return false;
  try {
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), 8000);
    const res = await fetch(DISCORD_WEBHOOK, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ content: text }),
      signal: ctrl.signal,
    });
    clearTimeout(timer);
    return res.ok;
  } catch {
    return false;
  }
}

interface Alert {
  key: string;   // dedup key — don't re-send same alert
  text: string;
}

function detectAlerts(projects: Project[]): Alert[] {
  const alerts: Alert[] = [];
  const today = new Date().toLocaleDateString("ko-KR", { month: "long", day: "numeric" });

  projects.forEach(p => {
    if (p.status === "complete") return;
    const days = Math.floor((Date.now() - new Date(p.lastActivity).getTime()) / 864e5);
    const pending = p.tasks.filter(t => !t.done);

    // 🚨 HIGH 우선순위 + 7일 이상 방치
    if (p.priority === "high" && days >= 7) {
      alerts.push({
        key: `neglect-high-${p.id}`,
        text: `🚨 [Pixel HQ 긴급] ${today}\n\n📌 ${p.name}\n긴급 프로젝트가 ${days}일째 방치 중입니다!\n미완료 태스크: ${pending.length}건\n\n즉시 확인이 필요합니다.`,
      });
    }

    // ⚠️ 일반 3일+ 방치
    else if (days >= 3 && (p.status === "active" || p.status === "pivot")) {
      alerts.push({
        key: `neglect-${p.id}-${days}`,
        text: `⚠️ [Pixel HQ 알림] ${today}\n\n📌 ${p.name}\n${days}일째 업데이트 없음\n미완료: ${pending.map(t => `• ${t.text}`).join("\n") || "없음"}`,
      });
    }

    // 🔥 HIGH + 미완료 태스크 존재 (매일 리마인드)
    if (p.priority === "high" && pending.length > 0 && days < 7) {
      alerts.push({
        key: `urgent-tasks-${p.id}-${new Date().toDateString()}`,
        text: `🔥 [Pixel HQ 오늘 할 일] ${today}\n\n📌 ${p.name} (긴급)\n남은 태스크:\n${pending.slice(0, 5).map(t => `• ${t.text}`).join("\n")}`,
      });
    }
  });

  return alerts;
}

export function useAlertWatcher(projects: Project[]) {
  const sentRef      = useRef<Set<string>>(new Set());
  const timerRef     = useRef<ReturnType<typeof setInterval> | null>(null);
  const tgFailures   = useRef(0);
  const dcFailures   = useRef(0);

  async function notify(text: string) {
    if (isTelegramConfigured && tgFailures.current < MAX_FAILURES) {
      const ok = await sendTelegram(text);
      tgFailures.current = ok ? 0 : tgFailures.current + 1;
    }
    if (DISCORD_WEBHOOK && dcFailures.current < MAX_FAILURES) {
      const ok = await sendDiscord(text);
      dcFailures.current = ok ? 0 : dcFailures.current + 1;
    }
  }

  useEffect(() => {
    if (!isTelegramConfigured && !DISCORD_WEBHOOK) return;
    if (!projects.length) return;

    async function check() {
      const alerts = detectAlerts(projects);
      let sent = 0;
      for (const alert of alerts) {
        if (sent >= MAX_ALERTS_PER_CYCLE) break;
        if (sentRef.current.has(alert.key)) continue;
        sentRef.current.add(alert.key);
        await notify(alert.text);
        sent++;
      }
    }

    check();
    timerRef.current = setInterval(check, CHECK_INTERVAL);
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [projects]);
}
