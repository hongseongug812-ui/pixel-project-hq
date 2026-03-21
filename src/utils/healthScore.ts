import type { Project } from "../types";
import type { ServerStatsMap } from "../types";

/**
 * 프로젝트 건강 점수를 0~100 범위로 계산한다.
 *
 * | 항목           | 가중치 | 세부 규칙                              |
 * |----------------|--------|----------------------------------------|
 * | 진행률         | 40%    | progress * 0.4                         |
 * | 최근 활동      | 30%    | 오늘→30, 1일→25, 3일→18, 7일→8, 14일→3, 초과→0 |
 * | 태스크 완료율  | 20%    | done/total * 20, 태스크 없으면 중립 10  |
 * | 서버 상태      | 10%    | up→10, 미등록→10, 알 수 없음→5, down→0 |
 */
export function calcHealthScore(p: Project, serverStats: ServerStatsMap): number {
  if (p.status === "complete") return 100;
  if (p.status === "paused") return 30;

  // 진행률 (0~40)
  const progressScore = p.progress * 0.4;

  // 최근 활동 (0~30): 1일→30, 3일→20, 7일→5, 14일+→0
  const daysSince = Math.floor((Date.now() - new Date(p.lastActivity).getTime()) / 864e5);
  const activityScore = daysSince === 0 ? 30 : daysSince <= 1 ? 25 : daysSince <= 3 ? 18 : daysSince <= 7 ? 8 : daysSince <= 14 ? 3 : 0;

  // 태스크 완료율 (0~20)
  const total = p.tasks.length;
  const done  = p.tasks.filter(t => t.done).length;
  const taskScore = total > 0 ? (done / total) * 20 : 10; // 태스크 없으면 중립 10

  // 서버 상태 (0~10)
  let serverScore = 10;
  if (p.serverUrl) {
    const stat = serverStats[p.serverUrl];
    if (!stat) serverScore = 5;
    else if (stat.status === "down") serverScore = 0;
    else serverScore = 10;
  }

  return Math.min(100, Math.round(progressScore + activityScore + taskScore + serverScore));
}

export function healthColor(score: number): string {
  if (score >= 75) return "#4ade80"; // green
  if (score >= 50) return "#facc15"; // yellow
  if (score >= 25) return "#f97316"; // orange
  return "#ef4444";                  // red
}

export function healthLabel(score: number): string {
  if (score >= 75) return "HEALTHY";
  if (score >= 50) return "OK";
  if (score >= 25) return "WARN";
  return "CRITICAL";
}
