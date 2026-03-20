import { useMemo } from "react";
import { PF, BF, STATUS_MAP } from "../data/constants";
import { calcHealthScore, healthColor, healthLabel } from "../utils/healthScore";
import type { Project, ServerStatsMap } from "../types";

const COLUMNS: { key: Project["status"]; icon: string }[] = [
  { key: "active",   icon: "⚡" },
  { key: "pivot",    icon: "🔄" },
  { key: "paused",   icon: "💤" },
  { key: "complete", icon: "✅" },
];

interface Props {
  projects: Project[];
  serverStats: ServerStatsMap;
  onSelect: (id: number | string) => void;
}

function PriorityDot({ priority }: { priority: Project["priority"] }) {
  const c = priority === "high" ? "#ef4444" : priority === "medium" ? "#facc15" : "#4ade80";
  return <span style={{ display: "inline-block", width: 6, height: 6, borderRadius: "50%", background: c, marginRight: 4, flexShrink: 0 }} />;
}

export default function KanbanView({ projects, serverStats, onSelect }: Props) {
  const grouped = useMemo(() => {
    const g: Partial<Record<Project["status"], Project[]>> = {};
    for (const col of COLUMNS) g[col.key] = [];
    for (const p of projects) g[p.status]?.push(p);
    return g;
  }, [projects]);

  return (
    <div style={{ padding: "12px 14px", overflowX: "auto" }}>
      <div style={{ display: "flex", gap: 12, minWidth: 760, alignItems: "flex-start" }}>
        {COLUMNS.map(col => {
          const items = grouped[col.key] ?? [];
          const st = STATUS_MAP[col.key];
          return (
            <div key={col.key} style={{ flex: 1, minWidth: 180, background: "#0c0c14", border: `1px solid ${st.color}22`, borderRadius: 4 }}>
              {/* Column header */}
              <div style={{ padding: "8px 10px", borderBottom: `1px solid ${st.color}22`, display: "flex", alignItems: "center", gap: 6, background: `${st.color}08` }}>
                <span style={{ fontSize: 12 }}>{col.icon}</span>
                <span style={{ fontFamily: PF, fontSize: 6, color: st.color }}>{st.label}</span>
                <span style={{ fontFamily: PF, fontSize: 6, color: "#333", marginLeft: "auto" }}>{items.length}</span>
              </div>

              {/* Cards */}
              <div style={{ padding: 8, display: "flex", flexDirection: "column", gap: 6, minHeight: 60 }}>
                {items.length === 0 && (
                  <div style={{ fontFamily: BF, fontSize: 11, color: "#2a2a38", textAlign: "center", padding: "16px 0" }}>없음</div>
                )}
                {items.map(p => {
                  const hs = calcHealthScore(p, serverStats);
                  const hc = healthColor(hs);
                  const hl = healthLabel(hs);
                  const pending = p.tasks.filter(t => !t.done).length;
                  const done    = p.tasks.filter(t => t.done).length;
                  return (
                    <div
                      key={p.id}
                      onClick={() => onSelect(p.id)}
                      style={{
                        background: "#0e0e18", border: `1px solid ${hc}33`,
                        borderRadius: 3, padding: "8px 10px", cursor: "pointer",
                        transition: "border-color 0.15s",
                      }}
                      onMouseEnter={e => (e.currentTarget.style.borderColor = `${hc}88`)}
                      onMouseLeave={e => (e.currentTarget.style.borderColor = `${hc}33`)}
                    >
                      {/* Title row */}
                      <div style={{ display: "flex", alignItems: "center", gap: 4, marginBottom: 5 }}>
                        <PriorityDot priority={p.priority} />
                        <span style={{ fontFamily: BF, fontSize: 12, color: "#ccc", flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{p.name}</span>
                      </div>

                      {/* Progress bar */}
                      <div style={{ height: 3, background: "#1a1a28", borderRadius: 2, marginBottom: 5 }}>
                        <div style={{ height: 3, width: `${p.progress}%`, background: st.color, borderRadius: 2 }} />
                      </div>

                      {/* Meta */}
                      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                          {/* Task count */}
                          {p.tasks.length > 0 && (
                            <span style={{ fontFamily: PF, fontSize: 4, color: "#555" }}>
                              ✓{done}/{p.tasks.length}
                            </span>
                          )}
                          {/* Pending tasks badge */}
                          {pending > 0 && (
                            <span style={{ fontFamily: PF, fontSize: 4, color: "#f97316" }}>
                              [{pending} 남음]
                            </span>
                          )}
                        </div>
                        {/* Health badge */}
                        <span style={{
                          fontFamily: PF, fontSize: 4, color: hc,
                          background: `${hc}18`, border: `1px solid ${hc}44`,
                          padding: "1px 5px", borderRadius: 2,
                        }}>
                          {hl} {hs}
                        </span>
                      </div>

                      {/* Stack tags */}
                      {p.stack.length > 0 && (
                        <div style={{ marginTop: 5, display: "flex", gap: 3, flexWrap: "wrap" }}>
                          {p.stack.slice(0, 3).map(s => (
                            <span key={s} style={{ fontFamily: BF, fontSize: 10, color: "#444", background: "#111118", border: "1px solid #1e1e28", padding: "1px 5px" }}>{s}</span>
                          ))}
                          {p.stack.length > 3 && <span style={{ fontFamily: BF, fontSize: 10, color: "#333" }}>+{p.stack.length - 3}</span>}
                        </div>
                      )}

                      {/* Server indicator */}
                      {p.serverUrl && (
                        <div style={{ marginTop: 4, display: "flex", alignItems: "center", gap: 3 }}>
                          <span style={{ width: 5, height: 5, borderRadius: "50%", background: "#4ade80", display: "inline-block" }} />
                          <span style={{ fontFamily: PF, fontSize: 4, color: "#4ade80" }}>LIVE</span>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
