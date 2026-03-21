const BOT_TOKEN = import.meta.env.VITE_TELEGRAM_BOT_TOKEN as string | undefined;
const CHAT_ID   = import.meta.env.VITE_TELEGRAM_CHAT_ID as string | undefined;

export const isTelegramConfigured = !!BOT_TOKEN && !!CHAT_ID;

export async function sendTelegram(text: string): Promise<boolean> {
  if (!BOT_TOKEN || !CHAT_ID) return false;
  try {
    const res = await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ chat_id: CHAT_ID, text }),
    });
    return res.ok;
  } catch {
    return false;
  }
}

import type { Project } from "../types";

export function buildDailyBriefing(projects: Project[]): string {
  const active  = projects.filter(p => p.status === "active" || p.status === "pivot");
  const done    = projects.filter(p => p.status === "complete");
  const paused  = projects.filter(p => p.status === "paused");
  const neglected = active.filter(p => {
    const days = Math.floor((Date.now() - new Date(p.lastActivity).getTime()) / 864e5);
    return days >= 3;
  });
  const avgProgress = active.length
    ? Math.round(active.reduce((s, p) => s + p.progress, 0) / active.length)
    : 0;

  const date = new Date().toLocaleDateString("ko-KR", { month: "long", day: "numeric", weekday: "short" });

  let msg = `🏢 Pixel HQ 일일 브리핑 — ${date}\n`;
  msg += `━━━━━━━━━━━━━━━━\n`;
  msg += `📊 전체 ${projects.length}개 | 진행 ${active.length}개 | 완료 ${done.length}개 | 중단 ${paused.length}개\n`;
  msg += `📈 진행 중 평균 진행률: ${avgProgress}%\n\n`;

  if (active.length) {
    msg += `🔥 진행 중\n`;
    active.slice(0, 5).forEach(p => {
      const bar = "█".repeat(Math.round(p.progress / 10)) + "░".repeat(10 - Math.round(p.progress / 10));
      msg += `• ${p.name} [${bar}] ${p.progress}%\n`;
    });
    msg += "\n";
  }

  if (neglected.length) {
    msg += `⚠️ 방치 중 (3일+)\n`;
    neglected.forEach(p => {
      const days = Math.floor((Date.now() - new Date(p.lastActivity).getTime()) / 864e5);
      msg += `• ${p.name} — ${days}일째 업데이트 없음\n`;
    });
    msg += "\n";
  }

  const highPriority = active.filter(p => p.priority === "high");
  if (highPriority.length) {
    msg += `🚨 HIGH 우선순위\n`;
    highPriority.forEach(p => { msg += `• ${p.name}\n`; });
  }

  return msg;
}
