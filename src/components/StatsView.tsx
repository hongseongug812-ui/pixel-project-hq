import { useMemo } from "react";
import { PF, BF, AGENTS } from "../data/constants";
import { calcHealthScore, healthColor } from "../utils/healthScore";
import { daysSince } from "../utils/helpers";
import type { Project, AgentState, ServerStatsMap } from "../types";

interface Props {
  projects: Project[];
  agentState: AgentState[];
  serverStats: ServerStatsMap;
  onClose: () => void;
  onSelect: (id: number | string) => void;
}

export default function StatsView({ projects, agentState, serverStats, onClose, onSelect }: Props) {
  const stats = useMemo(() => {
    const total = projects.length;
    const byStatus = { active: 0, pivot: 0, complete: 0, paused: 0 };
    projects.forEach(p => { byStatus[p.status] = (byStatus[p.status] ?? 0) + 1; });

    const totalBudget = projects.reduce((s, p) => s + (p.budget ?? 0), 0);
    const avgProgress = total > 0 ? Math.round(projects.reduce((s, p) => s + p.progress, 0) / total) : 0;

    const servers = projects.filter(p => p.serverUrl);
    const upServers = servers.filter(p => serverStats[p.serverUrl!]?.status !== "down").length;
    const avgUptime = servers.length > 0
      ? Math.round(servers.reduce((s, p) => s + (serverStats[p.serverUrl!]?.uptime ?? 99.9), 0) / servers.length * 10) / 10
      : null;

    const neglected = projects.filter(p => p.status !== "complete" && daysSince(p.lastActivity) >= 7);
    const highPriority = projects.filter(p => p.priority === "high" && p.status !== "complete");

    const upcoming = projects
      .filter(p => p.targetDate && p.status !== "complete")
      .map(p => ({ ...p, daysLeft: Math.ceil((new Date(p.targetDate!).getTime() - Date.now()) / 864e5) }))
      .sort((a, b) => a.daysLeft - b.daysLeft)
      .slice(0, 5);

    const healthList = projects
      .map(p => ({ ...p, hs: calcHealthScore(p, serverStats) }))
      .sort((a, b) => a.hs - b.hs)
      .slice(0, 5);

    // 에이전트별 배정 프로젝트 수
    const agentLoad = AGENTS.map(a => ({
      ...a,
      count: projects.filter(p => p.assignedAgentId === a.id).length,
      currentTask: agentState.find(s => s.id === a.id)?.currentTask ?? a.task,
    }));

    return { total, byStatus, totalBudget, avgProgress, servers: servers.length, upServers, avgUptime, neglected, highPriority, upcoming, healthList, agentLoad };
  }, [projects, serverStats, agentState]);

  const S = (label: string, value: string | number, color = "#aaa", sub?: string) => (
    <div style={{ background: "#0c0c14", border: "1px solid #1a1a24", padding: "8px 10px", borderRadius: 2 }}>
      <div style={{ fontFamily: PF, fontSize: 4, color: "#555", marginBottom: 3 }}>{label}</div>
      <div style={{ fontFamily: PF, fontSize: 10, color }}>{value}</div>
      {sub && <div style={{ fontFamily: BF, fontSize: 10, color: "#555", marginTop: 2 }}>{sub}</div>}
    </div>
  );

  return (
    <div style={{
      position: "fixed", inset: 0, background: "rgba(0,0,0,.7)", zIndex: 800,
      display: "flex", alignItems: "center", justifyContent: "center",
    }} onClick={onClose}>
      <div
        onClick={e => e.stopPropagation()}
        style={{
          background: "#0a0a12", border: "1px solid #f472b633", borderRadius: 4,
          width: 680, maxWidth: "96vw", maxHeight: "90vh", overflow: "auto",
          padding: 20, display: "flex", flexDirection: "column", gap: 16,
        }}
      >
        {/* Header */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div style={{ fontFamily: PF, fontSize: 8, color: "#f472b6", letterSpacing: 2 }}>📊 COMPANY STATS</div>
          <button onClick={onClose} style={{ all: "unset", cursor: "pointer", fontFamily: PF, fontSize: 8, color: "#555" }}>✕</button>
        </div>

        {/* KPI 카드 그리드 */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 8 }}>
          {S("총 프로젝트", stats.total, "#facc15")}
          {S("평균 진행률", `${stats.avgProgress}%`, "#4ade80")}
          {S("총 예산", stats.totalBudget > 0 ? `${stats.totalBudget.toLocaleString()}만` : "–", "#a78bfa")}
          {S("서버 업타임", stats.avgUptime !== null ? `${stats.avgUptime}%` : "–", "#60a5fa", `${stats.upServers}/${stats.servers} 운영 중`)}
        </div>

        {/* 상태별 분포 */}
        <div>
          <div style={{ fontFamily: PF, fontSize: 5, color: "#555", marginBottom: 6 }}>STATUS 분포</div>
          <div style={{ display: "flex", gap: 3, height: 14 }}>
            {([["active","#4ade80"],["pivot","#facc15"],["paused","#a78bfa"],["complete","#60a5fa"]] as [string,string][]).map(([k, c]) => {
              const count = stats.byStatus[k as keyof typeof stats.byStatus];
              const pct = stats.total > 0 ? (count / stats.total) * 100 : 0;
              return pct > 0 ? (
                <div key={k} title={`${k}: ${count}`} style={{ flex: pct, background: c, borderRadius: 2, display: "flex", alignItems: "center", justifyContent: "center", overflow: "hidden" }}>
                  <span style={{ fontFamily: PF, fontSize: 3, color: "#000" }}>{count}</span>
                </div>
              ) : null;
            })}
          </div>
          <div style={{ display: "flex", gap: 10, marginTop: 4 }}>
            {([["active","#4ade80","활성"],["pivot","#facc15","피벗"],["paused","#a78bfa","중단"],["complete","#60a5fa","완료"]] as [string,string,string][]).map(([k,c,l]) => (
              <div key={k} style={{ display: "flex", alignItems: "center", gap: 3 }}>
                <div style={{ width: 6, height: 6, background: c, borderRadius: 1 }} />
                <span style={{ fontFamily: PF, fontSize: 3, color: "#666" }}>{l} {stats.byStatus[k as keyof typeof stats.byStatus]}</span>
              </div>
            ))}
          </div>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
          {/* 마감 임박 */}
          <div>
            <div style={{ fontFamily: PF, fontSize: 5, color: "#555", marginBottom: 5 }}>⏰ 마감 임박</div>
            {stats.upcoming.length === 0
              ? <div style={{ fontFamily: BF, fontSize: 11, color: "#333" }}>마감 설정된 프로젝트 없음</div>
              : stats.upcoming.map(p => (
                <button key={p.id} onClick={() => { onSelect(p.id); onClose(); }} style={{
                  all: "unset", cursor: "pointer", display: "flex", justifyContent: "space-between", alignItems: "center",
                  padding: "3px 6px", marginBottom: 2, width: "100%", boxSizing: "border-box",
                  background: "#0c0c16", border: `1px solid ${p.daysLeft < 0 ? "#ef444433" : p.daysLeft < 7 ? "#f59e0b33" : "#1a1a28"}`,
                }}>
                  <span style={{ fontFamily: BF, fontSize: 11, color: "#999", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", flex: 1 }}>{p.name}</span>
                  <span style={{ fontFamily: PF, fontSize: 4, color: p.daysLeft < 0 ? "#ef4444" : p.daysLeft < 7 ? "#f59e0b" : "#555", flexShrink: 0, marginLeft: 6 }}>
                    {p.daysLeft < 0 ? `+${Math.abs(p.daysLeft)}d` : `D-${p.daysLeft}`}
                  </span>
                </button>
              ))
            }
          </div>

          {/* 헬스 스코어 하위 */}
          <div>
            <div style={{ fontFamily: PF, fontSize: 5, color: "#555", marginBottom: 5 }}>🏥 헬스 하위 프로젝트</div>
            {stats.healthList.length === 0
              ? <div style={{ fontFamily: BF, fontSize: 11, color: "#333" }}>프로젝트 없음</div>
              : stats.healthList.map(p => {
                const hc = healthColor(p.hs);
                return (
                  <button key={p.id} onClick={() => { onSelect(p.id); onClose(); }} style={{
                    all: "unset", cursor: "pointer", display: "flex", alignItems: "center", gap: 6,
                    padding: "3px 6px", marginBottom: 2, width: "100%", boxSizing: "border-box",
                    background: "#0c0c16", border: "1px solid #1a1a28",
                  }}>
                    <div style={{ width: 28, height: 4, background: "#1a1a22", borderRadius: 2, flexShrink: 0 }}>
                      <div style={{ width: `${p.hs}%`, height: "100%", background: hc, borderRadius: 2 }} />
                    </div>
                    <span style={{ fontFamily: PF, fontSize: 4, color: hc, flexShrink: 0 }}>{p.hs}</span>
                    <span style={{ fontFamily: BF, fontSize: 11, color: "#888", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{p.name}</span>
                  </button>
                );
              })
            }
          </div>
        </div>

        {/* 에이전트 현황 */}
        <div>
          <div style={{ fontFamily: PF, fontSize: 5, color: "#555", marginBottom: 5 }}>🤖 에이전트 현황</div>
          <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
            {stats.agentLoad.map(a => (
              <div key={a.id} style={{ background: "#0c0c16", border: `1px solid ${a.body}22`, padding: "6px 8px", borderRadius: 2, minWidth: 90 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 4, marginBottom: 3 }}>
                  <span style={{ fontSize: 11 }}>{a.emoji}</span>
                  <span style={{ fontFamily: PF, fontSize: 5, color: a.body }}>{a.name}</span>
                </div>
                <div style={{ fontFamily: BF, fontSize: 10, color: "#555", marginBottom: 2 }}>{a.role}</div>
                <div style={{ fontFamily: PF, fontSize: 3, color: "#444" }}>담당 {a.count}건</div>
                <div style={{ fontFamily: BF, fontSize: 9, color: "#666", marginTop: 2, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", maxWidth: 90 }}>{a.currentTask}</div>
              </div>
            ))}
          </div>
        </div>

        {/* 경고 섹션 */}
        {(stats.neglected.length > 0 || stats.highPriority.length > 0) && (
          <div style={{ background: "#100a08", border: "1px solid #ef444422", borderRadius: 2, padding: "8px 10px" }}>
            <div style={{ fontFamily: PF, fontSize: 5, color: "#ef4444", marginBottom: 5 }}>⚠️ 주의 필요</div>
            {stats.neglected.map(p => (
              <button key={p.id} onClick={() => { onSelect(p.id); onClose(); }} style={{
                all: "unset", cursor: "pointer", display: "block", fontFamily: BF, fontSize: 11,
                color: "#f59e0b", padding: "1px 0", width: "100%",
              }}>
                • {p.name} — {daysSince(p.lastActivity)}일 방치
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
