import { useState } from "react";
import { PF, BF, ROOMS } from "../data/constants";
import { neglect, daysSince } from "../utils/helpers";

function ServerMonitor({ projects, serverStats }) {
  const deployed = projects.filter(p => p.serverUrl);
  if (deployed.length === 0) return (
    <div style={{ background: "#090f09", border: "1px solid #4ade8022", borderRadius: 3, padding: 8 }}>
      <div style={{ fontFamily: PF, fontSize: 6, color: "#4ade8055", marginBottom: 4, letterSpacing: 1 }}>📡 LIVE SERVERS</div>
      <div style={{ fontFamily: BF, fontSize: 11, color: "#333", textAlign: "center", padding: "6px 0" }}>
        배포된 서버 없음<br />
        <span style={{ color: "#222", fontSize: 10 }}>프로젝트에 URL 등록 시 표시</span>
      </div>
    </div>
  );

  return (
    <div style={{ background: "#070e07", border: "1px solid #4ade8033", borderRadius: 3, padding: 8 }}>
      <div style={{ fontFamily: PF, fontSize: 6, color: "#4ade80", marginBottom: 6, letterSpacing: 1, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <span>📡 LIVE SERVERS</span>
        <div style={{ display: "flex", alignItems: "center", gap: 3 }}>
          <div style={{ width: 5, height: 5, borderRadius: "50%", background: "#4ade80", boxShadow: "0 0 4px #4ade80" }} />
          <span style={{ fontFamily: PF, fontSize: 4, color: "#4ade8088" }}>{deployed.length} ONLINE</span>
        </div>
      </div>

      {deployed.map(p => {
        const s = serverStats[p.serverUrl] || { ping: 18, uptime: 99.9, status: "up" };
        const isUp = s.status !== "down";
        const pingColor = s.ping < 50 ? "#4ade80" : s.ping < 150 ? "#facc15" : "#ef4444";
        const domain = p.serverUrl.replace(/^https?:\/\//, "").slice(0, 22);
        return (
          <div key={p.id} style={{
            display: "flex", alignItems: "center", gap: 5,
            padding: "4px 5px", marginBottom: 2,
            background: "#0a130a", border: `1px solid ${isUp ? "#4ade8018" : "#ef444422"}`, borderRadius: 2,
          }}>
            <div style={{ width: 6, height: 6, borderRadius: "50%", background: isUp ? "#4ade80" : "#ef4444", flexShrink: 0, boxShadow: isUp ? "0 0 4px #4ade80" : "0 0 4px #ef4444" }} />
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontFamily: PF, fontSize: 4, color: isUp ? "#4ade80" : "#ef4444", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{domain}</div>
              <div style={{ fontFamily: BF, fontSize: 10, color: "#555" }}>{p.name}</div>
            </div>
            <div style={{ textAlign: "right", flexShrink: 0 }}>
              <div style={{ fontFamily: PF, fontSize: 4, color: pingColor }}>{s.real ? "" : "~"}{Math.round(s.ping)}ms</div>
              <div style={{ fontFamily: PF, fontSize: 4, color: "#333" }}>{s.uptime?.toFixed(1)}%</div>
            </div>
          </div>
        );
      })}

      <div style={{ marginTop: 4, padding: "3px 4px", background: "#050d05", borderRadius: 2 }}>
        <div style={{ fontFamily: PF, fontSize: 4, color: "#4ade8055", marginBottom: 2 }}>24H UPTIME</div>
        <svg width="100%" height="14" viewBox="0 0 180 14" preserveAspectRatio="none">
          <polyline
            points={Array.from({ length: 36 }, (_, i) => `${i * 5},${1 + Math.random() * 10}`).join(" ")}
            fill="none" stroke="#4ade80" strokeWidth="1" opacity=".4"
          />
        </svg>
      </div>
    </div>
  );
}

function ProjectHealth({ projects }) {
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

function AlertsPanel({ projects }) {
  const alerts = [];
  projects.forEach(p => {
    const nl = neglect(p.lastActivity, p.status);
    if (nl === 2) alerts.push({ icon: "🚨", title: p.name, msg: `${daysSince(p.lastActivity)}일째 방치`, color: "#ef4444" });
    else if (nl === 1) alerts.push({ icon: "⚠️", title: p.name, msg: `${daysSince(p.lastActivity)}일째 미관리`, color: "#f59e0b" });
  });
  projects.filter(p => p.priority === "high" && (p.status === "active" || p.status === "pivot")).forEach(p => {
    const pending = p.tasks.filter(t => !t.done).length;
    if (pending > 0) alerts.push({ icon: "🔥", title: p.name, msg: `긴급 — 미완료 ${pending}건`, color: "#ef4444" });
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
        <div key={i} style={{ display: "flex", alignItems: "center", gap: 5, padding: "4px 5px", marginBottom: 2, background: "#220808", borderRadius: 2 }}>
          <span style={{ fontSize: 10, flexShrink: 0 }}>{a.icon}</span>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontFamily: BF, fontSize: 11, color: a.color, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{a.title}</div>
            <div style={{ fontFamily: BF, fontSize: 10, color: "#777" }}>{a.msg}</div>
          </div>
        </div>
      ))}
    </div>
  );
}

function AgentStatus({ agentState }) {
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

const LOG_TYPE_STYLE = {
  deploy:  { bg: "#081208", border: "#4ade8033", dot: "#4ade80" },
  alert:   { bg: "#120808", border: "#ef444430", dot: "#ef4444" },
  review:  { bg: "#08080e", border: "#60a5fa30", dot: "#60a5fa" },
  security:{ bg: "#0a080e", border: "#a78bfa30", dot: "#a78bfa" },
  default: { bg: "#0a0a0e", border: "#1a1a2a",   dot: "#555"    },
};

function getLogType(msg) {
  if (msg.includes("배포") || msg.includes("서버") || msg.includes("등록")) return "deploy";
  if (msg.includes("방치") || msg.includes("긴급") || msg.includes("⚠")) return "alert";
  if (msg.includes("리뷰") || msg.includes("review")) return "review";
  if (msg.includes("보안") || msg.includes("스캔")) return "security";
  return "default";
}

function ActivityLog({ logs }) {
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

export default function LeftSidebar({ projects, agentState, logs, serverStats }) {
  return (
    <div style={{
      width: 230, minWidth: 210, flexShrink: 0, padding: 8,
      borderRight: "2px solid #1a1a28", background: "#0a0a10",
      display: "flex", flexDirection: "column", gap: 6, overflow: "auto",
      height: "calc(100vh - 80px)",
    }}>
      <ServerMonitor projects={projects} serverStats={serverStats || {}} />
      <AlertsPanel projects={projects} />
      <ProjectHealth projects={projects} />
      <AgentStatus agentState={agentState} />
      <ActivityLog logs={logs} />
    </div>
  );
}
