import { useState } from "react";
import { PF, BF, ROOMS } from "../data/constants";
import { neglect, daysSince } from "../utils/helpers";
import { useLogs } from "../contexts/LogsContext";
import { isTelegramConfigured, sendTelegram, buildDailyBriefing } from "../lib/telegram";
import type { PingHistory } from "../hooks/useServerStats";
import type { Project, AgentState, ServerStatsMap } from "../types";


interface ServerMonitorProps {
  projects: Project[];
  serverStats: ServerStatsMap;
  pingHistory: PingHistory;
  pinging: Set<string>;
  onRecheck: (url: string) => void;
  onGoToProject: (id: number | string) => void;
  onRemoveServer: (projectId: number | string) => void;
}
function ServerMonitor({ projects, serverStats, pingHistory, pinging, onRecheck, onGoToProject, onRemoveServer }: ServerMonitorProps) {
  const [expanded, setExpanded] = useState<number | string | null>(null);
  const deployed = projects.filter(p => p.serverUrl);

  const openUrl = (url: string) => {
    const full = url.startsWith("http") ? url : `https://${url}`;
    try { window.open(new URL(full).href, "_blank", "noopener,noreferrer"); } catch { /* invalid */ }
  };

  if (deployed.length === 0) return (
    <div style={{ background: "#090f09", border: "1px solid #4ade8022", borderRadius: 3, padding: 8 }}>
      <div style={{ fontFamily: PF, fontSize: 6, color: "#4ade8055", marginBottom: 4, letterSpacing: 1 }}>📡 SERVER MANAGER</div>
      <div style={{ fontFamily: BF, fontSize: 11, color: "#333", textAlign: "center", padding: "6px 0" }}>
        배포된 서버 없음<br />
        <span style={{ color: "#222", fontSize: 10 }}>프로젝트에 URL 등록 시 표시</span>
      </div>
    </div>
  );

  const upCount = deployed.filter(p => serverStats[p.serverUrl!]?.status !== "down").length;

  return (
    <div style={{ background: "#070e07", border: "1px solid #4ade8033", borderRadius: 3, padding: 8 }}>
      <div style={{ fontFamily: PF, fontSize: 6, color: "#4ade80", marginBottom: 6, letterSpacing: 1, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <span>📡 SERVER MANAGER</span>
        <div style={{ display: "flex", alignItems: "center", gap: 3 }}>
          <div style={{ width: 5, height: 5, borderRadius: "50%", background: "#4ade80", boxShadow: "0 0 4px #4ade80" }} />
          <span style={{ fontFamily: PF, fontSize: 4, color: "#4ade8088" }}>{upCount}/{deployed.length}</span>
        </div>
      </div>

      {deployed.map(p => {
        const url = p.serverUrl!;
        const s = serverStats[url] || { ping: 0, uptime: 99.9, status: "up" as const, real: false };
        const isUp = s.status !== "down";
        const isPinging = pinging.has(url);
        const pingColor = s.ping < 50 ? "#4ade80" : s.ping < 150 ? "#facc15" : "#ef4444";
        const domain = url.replace(/^https?:\/\//, "").slice(0, 22);
        const hist = pingHistory[url] ?? [];
        const isOpen = expanded === p.id;

        return (
          <div key={p.id} style={{ marginBottom: 3 }}>
            {/* 서버 행 */}
            <div
              onClick={() => setExpanded(isOpen ? null : p.id)}
              style={{
                display: "flex", alignItems: "center", gap: 5,
                padding: "4px 5px", cursor: "pointer",
                background: isOpen ? "#0d1a0d" : "#0a130a",
                border: `1px solid ${isUp ? (isOpen ? "#4ade8044" : "#4ade8018") : "#ef444422"}`,
                borderRadius: isOpen ? "2px 2px 0 0" : 2,
              }}
            >
              <div style={{ width: 6, height: 6, borderRadius: "50%", flexShrink: 0, background: isUp ? "#4ade80" : "#ef4444", boxShadow: isUp ? "0 0 4px #4ade80" : "0 0 4px #ef4444" }} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontFamily: PF, fontSize: 4, color: isUp ? "#4ade80" : "#ef4444", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{domain}</div>
                <div style={{ fontFamily: BF, fontSize: 10, color: "#555", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{p.name}</div>
              </div>
              <div style={{ textAlign: "right", flexShrink: 0 }}>
                {s.real || s.ping > 0 ? (
                  <div style={{ fontFamily: PF, fontSize: 4, color: pingColor }}>{Math.round(s.ping)}ms</div>
                ) : (
                  <div style={{ fontFamily: PF, fontSize: 4, color: "#333" }}>---</div>
                )}
                <div style={{ fontFamily: PF, fontSize: 4, color: "#333" }}>{s.uptime?.toFixed(1)}%</div>
              </div>
              <span style={{ fontFamily: PF, fontSize: 4, color: "#2a3a2a", flexShrink: 0 }}>{isOpen ? "▲" : "▼"}</span>
            </div>

            {/* 확장 패널 */}
            {isOpen && (
              <div style={{ background: "#081008", border: "1px solid #4ade8022", borderTop: "none", padding: 8, borderRadius: "0 0 2px 2px" }}>
                {/* 핑 히스토리 그래프 */}
                {hist.length > 1 && (
                  <div style={{ marginBottom: 6 }}>
                    <div style={{ fontFamily: PF, fontSize: 4, color: "#4ade8055", marginBottom: 2 }}>PING HISTORY</div>
                    <svg width="100%" height="20" viewBox={`0 0 ${hist.length * 8} 20`} preserveAspectRatio="none" style={{ display: "block" }}>
                      {hist.map((v, i) => {
                        const maxP = Math.max(...hist, 100);
                        const h = Math.round((v / maxP) * 18);
                        const color = v < 50 ? "#4ade80" : v < 150 ? "#facc15" : "#ef4444";
                        return <rect key={i} x={i * 8 + 1} y={20 - h} width={6} height={h} fill={color} opacity="0.7" rx="1" />;
                      })}
                    </svg>
                  </div>
                )}

                {/* 상태 정보 */}
                <div style={{ display: "flex", gap: 8, marginBottom: 6 }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontFamily: PF, fontSize: 3, color: "#2a4a2a", marginBottom: 1 }}>STATUS</div>
                    <div style={{ fontFamily: PF, fontSize: 5, color: isUp ? "#4ade80" : "#ef4444" }}>{isUp ? "● UP" : "● DOWN"}</div>
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontFamily: PF, fontSize: 3, color: "#2a4a2a", marginBottom: 1 }}>UPTIME</div>
                    <div style={{ fontFamily: PF, fontSize: 5, color: "#4ade8088" }}>{s.uptime?.toFixed(2)}%</div>
                  </div>
                  {s.lastCheck && (
                    <div style={{ flex: 1 }}>
                      <div style={{ fontFamily: PF, fontSize: 3, color: "#2a4a2a", marginBottom: 1 }}>LAST CHECK</div>
                      <div style={{ fontFamily: BF, fontSize: 9, color: "#444" }}>{s.lastCheck}</div>
                    </div>
                  )}
                </div>

                {/* 액션 버튼 */}
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 3 }}>
                  <button
                    onClick={e => { e.stopPropagation(); onRecheck(url); }}
                    disabled={isPinging}
                    style={{ all: "unset", cursor: isPinging ? "not-allowed" : "pointer", fontFamily: PF, fontSize: 4, color: isPinging ? "#2a4a2a" : "#4ade80", background: "#0a180a", border: "1px solid #4ade8033", padding: "4px 0", textAlign: "center" }}
                  >
                    {isPinging ? "핑중..." : "🔄 재핑"}
                  </button>
                  <button
                    onClick={e => { e.stopPropagation(); openUrl(url); }}
                    style={{ all: "unset", cursor: "pointer", fontFamily: PF, fontSize: 4, color: "#60a5fa", background: "#080c18", border: "1px solid #60a5fa33", padding: "4px 0", textAlign: "center" }}
                  >
                    ↗ 열기
                  </button>
                  <button
                    onClick={e => { e.stopPropagation(); onGoToProject(p.id); setExpanded(null); }}
                    style={{ all: "unset", cursor: "pointer", fontFamily: PF, fontSize: 4, color: "#facc15", background: "#181200", border: "1px solid #facc1533", padding: "4px 0", textAlign: "center" }}
                  >
                    → 프로젝트
                  </button>
                  <button
                    onClick={e => { e.stopPropagation(); onRemoveServer(p.id); setExpanded(null); }}
                    style={{ all: "unset", cursor: "pointer", fontFamily: PF, fontSize: 4, color: "#ef4444", background: "#180808", border: "1px solid #ef444433", padding: "4px 0", textAlign: "center" }}
                  >
                    ✕ 제거
                  </button>
                </div>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

interface ProjectHealthProps { projects: Project[]; }
function ProjectHealth({ projects }: ProjectHealthProps) {
  const active = projects.filter(p => p.status === "active" || p.status === "pivot");
  if (active.length === 0) return null;
  return (
    <div style={{ background: "#0e0e14", border: "1px solid #1e1e28", borderRadius: 3, padding: 8 }}>
      <div style={{ fontFamily: PF, fontSize: 6, color: "#60a5fa", marginBottom: 6, letterSpacing: 1 }}>💻 PROJECT HEALTH</div>
      {active.slice(0, 5).map(p => {
        const nl = neglect(p.lastActivity, p.status);
        const barColor = nl === 2 ? "#ef4444" : nl === 1 ? "#f59e0b" : p.progress >= 70 ? "#4ade80" : "#60a5fa";
        return (
          <div key={p.id} style={{ marginBottom: 5 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 1 }}>
              <span style={{ fontFamily: BF, fontSize: 11, color: nl > 0 ? (nl === 2 ? "#ef4444" : "#f59e0b") : "#777", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", maxWidth: "70%" }}>
                {p.name}
              </span>
              <span style={{ fontFamily: PF, fontSize: 4, color: barColor }}>{p.progress}%</span>
            </div>
            <div style={{ height: 3, background: "#1a1a22", borderRadius: 1 }}>
              <div style={{ width: `${p.progress}%`, height: "100%", background: barColor, borderRadius: 1, transition: "width .3s", boxShadow: p.progress > 0 ? `0 0 4px ${barColor}` : "none" }} />
            </div>
          </div>
        );
      })}
    </div>
  );
}

interface Alert { icon: string; title: string; msg: string; color: string; projectId: number | string; actions: string[]; }

interface AlertsPanelProps { projects: Project[]; onSelect: (id: number | string) => void; }
function AlertsPanel({ projects, onSelect }: AlertsPanelProps) {
  const [expanded, setExpanded] = useState<number | null>(null);

  const alerts: Alert[] = [];
  projects.forEach(p => {
    const nl = neglect(p.lastActivity, p.status);
    const days = daysSince(p.lastActivity);
    if (nl === 2) alerts.push({
      icon: "🚨", title: p.name, msg: `${days}일째 방치`, color: "#ef4444", projectId: p.id,
      actions: [`마지막 활동 ${days}일 전`, "→ 진행 상황 업데이트 필요", "→ 상태를 paused로 변경 고려", `→ 미완료 태스크: ${p.tasks.filter(t => !t.done).length}건`],
    });
    else if (nl === 1) alerts.push({
      icon: "⚠️", title: p.name, msg: `${days}일째 미관리`, color: "#f59e0b", projectId: p.id,
      actions: [`마지막 활동 ${days}일 전`, "→ 태스크 진행 상황 확인 필요", `→ 미완료 태스크: ${p.tasks.filter(t => !t.done).length}건`],
    });
  });
  projects.filter(p => p.priority === "high" && (p.status === "active" || p.status === "pivot")).forEach(p => {
    const pending = p.tasks.filter(t => !t.done);
    if (pending.length > 0) alerts.push({
      icon: "🔥", title: p.name, msg: `긴급 — 미완료 ${pending.length}건`, color: "#ef4444", projectId: p.id,
      actions: pending.map(t => `• ${t.text}`),
    });
  });

  if (alerts.length === 0) return (
    <div style={{ background: "#080e08", border: "1px solid #4ade8018", borderRadius: 3, padding: "6px 8px", display: "flex", alignItems: "center", gap: 5 }}>
      <span style={{ fontSize: 10 }}>✅</span>
      <span style={{ fontFamily: BF, fontSize: 11, color: "#4ade8066" }}>이상 없음 — 모든 시스템 정상</span>
    </div>
  );

  return (
    <div style={{ background: "#1a0808", border: "1px solid #ef444430", borderRadius: 3, padding: 8 }}>
      <div style={{ fontFamily: PF, fontSize: 6, color: "#ef4444", marginBottom: 6, letterSpacing: 1, display: "flex", alignItems: "center", gap: 4 }}>
        <span style={{ animation: "blink 0.8s steps(2) infinite" }}>⚠</span> ALERTS
        <span style={{ fontFamily: BF, fontSize: 11, color: "#ef444466", marginLeft: "auto" }}>{alerts.length}건</span>
      </div>
      {alerts.slice(0, 4).map((a, i) => (
        <div key={i} style={{ marginBottom: 3 }}>
          <div
            onClick={() => setExpanded(expanded === i ? null : i)}
            style={{ display: "flex", alignItems: "center", gap: 5, padding: "4px 5px", background: "#220808", borderRadius: 2, cursor: "pointer" }}
          >
            <span style={{ fontSize: 10, flexShrink: 0 }}>{a.icon}</span>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontFamily: BF, fontSize: 11, color: a.color, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{a.title}</div>
              <div style={{ fontFamily: BF, fontSize: 10, color: "#777" }}>{a.msg}</div>
            </div>
            <span style={{ fontFamily: PF, fontSize: 5, color: "#444" }}>{expanded === i ? "▲" : "▼"}</span>
          </div>

          {expanded === i && (
            <div style={{ background: "#1a0a0a", border: "1px solid #ef444420", borderTop: "none", padding: "6px 8px" }}>
              <div style={{ fontFamily: PF, fontSize: 5, color: "#ef444488", marginBottom: 5 }}>조치 내용</div>
              {a.actions.map((action, j) => (
                <div key={j} style={{ fontFamily: BF, fontSize: 11, color: action.startsWith("•") ? "#f59e0b" : "#666", marginBottom: 2, paddingLeft: action.startsWith("→") || action.startsWith("•") ? 4 : 0 }}>
                  {action}
                </div>
              ))}
              <button
                onClick={() => { onSelect(a.projectId); setExpanded(null); }}
                style={{
                  all: "unset", cursor: "pointer", marginTop: 6,
                  fontFamily: PF, fontSize: 5, color: "#000",
                  background: a.color, padding: "3px 8px", display: "block",
                }}
              >
                프로젝트 열기 →
              </button>
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

interface AgentStatusProps { agentState: AgentState[]; }
function AgentStatus({ agentState }: AgentStatusProps) {
  return (
    <div style={{ background: "#0e0e14", border: "1px solid #1e1e28", borderRadius: 3, padding: 8 }}>
      <div style={{ fontFamily: PF, fontSize: 6, color: "#f4a261", marginBottom: 5, letterSpacing: 1 }}>🤖 AI AGENTS</div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 3 }}>
        {agentState.map(a => {
          const rm = ROOMS.find(r => r.key === a.room);
          return (
            <div key={a.id} style={{ background: "#0a0a12", border: "1px solid #1a1a22", borderRadius: 2, padding: "4px 5px" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 3, marginBottom: 1 }}>
                <span style={{ fontSize: 9 }}>{a.emoji}</span>
                <span style={{ fontFamily: PF, fontSize: 4, color: a.body }}>{a.name}</span>
              </div>
              <div style={{ fontFamily: BF, fontSize: 10, color: "#555", display: "flex", alignItems: "center", gap: 2 }}>
                <span style={{ color: rm?.color || "#555", fontSize: 7 }}>●</span>
                <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{a.currentTask || a.task}</span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

const LOG_TYPE_STYLE: Record<string, { bg: string; border: string; dot: string }> = {
  deploy:  { bg: "#081208", border: "#4ade8033", dot: "#4ade80" },
  alert:   { bg: "#120808", border: "#ef444430", dot: "#ef4444" },
  review:  { bg: "#08080e", border: "#60a5fa30", dot: "#60a5fa" },
  security:{ bg: "#0a080e", border: "#a78bfa30", dot: "#a78bfa" },
  default: { bg: "#0a0a0e", border: "#1a1a2a",   dot: "#555"    },
};

function getLogType(msg: string): string {
  if (msg.includes("배포") || msg.includes("서버") || msg.includes("등록")) return "deploy";
  if (msg.includes("방치") || msg.includes("긴급") || msg.includes("⚠")) return "alert";
  if (msg.includes("리뷰") || msg.includes("review")) return "review";
  if (msg.includes("보안") || msg.includes("스캔")) return "security";
  return "default";
}

interface ActivityLogProps { logs: import("../types").LogEntry[]; }
function ActivityLog({ logs }: ActivityLogProps) {
  const [filter, setFilter] = useState("all");
  const types = ["all", "deploy", "alert", "review", "security"];
  const filtered = filter === "all" ? logs : logs.filter(l => getLogType(l.msg) === filter);

  return (
    <div style={{ background: "#070710", border: "1px solid #14142a", borderRadius: 3, padding: 8, flex: 1 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 5 }}>
        <div style={{ fontFamily: PF, fontSize: 6, color: "#facc15", letterSpacing: 1 }}>📜 ACTIVITY LOG</div>
        <span style={{ fontFamily: PF, fontSize: 4, color: "#333" }}>{logs.length}</span>
      </div>
      <div style={{ display: "flex", gap: 2, marginBottom: 5, flexWrap: "wrap" }}>
        {types.map(t => (
          <button key={t} onClick={() => setFilter(t)} style={{
            all: "unset", cursor: "pointer", fontFamily: PF, fontSize: 4, padding: "1px 5px",
            color: filter === t ? "#000" : "#444",
            background: filter === t ? "#facc15" : "#111116",
            border: `1px solid ${filter === t ? "#b89a0d" : "#1e1e28"}`,
          }}>{t.toUpperCase()}</button>
        ))}
      </div>
      <div style={{ maxHeight: 240, overflowY: "auto", display: "flex", flexDirection: "column", gap: 1 }}>
        {filtered.slice(-30).reverse().map((l, i) => {
          const lt = getLogType(l.msg);
          const ts = LOG_TYPE_STYLE[lt];
          return (
            <div key={i} style={{ display: "flex", gap: 4, alignItems: "flex-start", padding: "3px 4px", background: ts.bg, border: `1px solid ${ts.border}`, borderRadius: 2 }}>
              <div style={{ width: 4, height: 4, borderRadius: "50%", background: ts.dot, flexShrink: 0, marginTop: 3 }} />
              <span style={{ fontSize: 9, flexShrink: 0 }}>{l.emoji}</span>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <span style={{ fontFamily: PF, fontSize: 4, color: l.color }}>{l.agent}</span>
                  <span style={{ fontFamily: PF, fontSize: 3, color: "#2a2a38" }}>{l.time}</span>
                </div>
                <div style={{ fontFamily: BF, fontSize: 10, color: "#666", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{l.msg}</div>
              </div>
            </div>
          );
        })}
        {filtered.length === 0 && (
          <div style={{ fontFamily: BF, fontSize: 11, color: "#333", textAlign: "center", padding: "8px 0" }}>로그 없음</div>
        )}
      </div>
    </div>
  );
}

interface LeftSidebarProps {
  projects: Project[];
  agentState: AgentState[];
  serverStats: ServerStatsMap;
  pingHistory: PingHistory;
  pinging: Set<string>;
  onSelectProject: (id: number | string) => void;
  onRecheckServer: (url: string) => void;
  onRemoveServer: (projectId: number | string) => void;
}

export default function LeftSidebar({ projects, agentState, serverStats, pingHistory, pinging, onSelectProject, onRecheckServer, onRemoveServer }: LeftSidebarProps) {
  const { logs } = useLogs();
  const [sending, setSending] = useState(false);

  async function handleBriefing() {
    setSending(true);
    const msg = buildDailyBriefing(projects);
    const ok = await sendTelegram(msg);
    setSending(false);
    if (!ok) alert("Telegram 전송 실패\n.env에 VITE_TELEGRAM_BOT_TOKEN, VITE_TELEGRAM_CHAT_ID 설정 필요");
  }

  return (
    <div style={{
      width: 230, minWidth: 210, flexShrink: 0, padding: 8,
      borderRight: "2px solid #1a1a28", background: "#0a0a10",
      display: "flex", flexDirection: "column", gap: 6, overflow: "auto",
      height: "calc(100vh - 80px)",
    }}>
      <ServerMonitor
        projects={projects}
        serverStats={serverStats || {}}
        pingHistory={pingHistory}
        pinging={pinging}
        onRecheck={onRecheckServer}
        onGoToProject={onSelectProject}
        onRemoveServer={onRemoveServer}
      />
      <AlertsPanel projects={projects} onSelect={onSelectProject} />
      <ProjectHealth projects={projects} />
      <AgentStatus agentState={agentState} />
      <ActivityLog logs={logs} />

      {/* Telegram briefing */}
      <button
        onClick={handleBriefing}
        disabled={sending}
        style={{
          all: "unset", cursor: sending ? "not-allowed" : "pointer",
          fontFamily: PF, fontSize: 5, color: isTelegramConfigured ? "#facc15" : "#333",
          background: "#0c0c14", border: `1px solid ${isTelegramConfigured ? "#facc1533" : "#1a1a28"}`,
          padding: "6px 8px", textAlign: "center",
        }}
        title={isTelegramConfigured ? "텔레그램으로 브리핑 전송" : ".env에 TELEGRAM 키 설정 필요"}
      >
        {sending ? "전송 중..." : isTelegramConfigured ? "📨 텔레그램 브리핑" : "📨 텔레그램 (미설정)"}
      </button>
    </div>
  );
}
