import { useState, useEffect, useRef } from "react";
import { PF, BF, STATUS_MAP, ROOMS, AGENTS } from "../data/constants";
import { neglect, daysSince } from "../utils/helpers";
import { safeOpenUrl } from "../utils/security";
import { suggestTasks, generateDescription, isOpenAIConfigured } from "../lib/openai";
import type { Project, ProjectStatus, ProjectPriority, Agent } from "../types";
import type { GitCommit } from "../hooks/useGitHub";

interface DetailPanelProps {
  project: Project;
  onClose: () => void;
  onToggle: (pid: number | string, tid: string) => void;
  onDelete: (id: number | string) => void;
  onSetServer: (id: number | string, url: string) => void;
  onAddTask: (pid: number | string, text: string) => void;
  onUpdate: (id: number | string, fields: Partial<Project>) => void;
  onClone?: (p: Project) => void;
  agents?: Agent[];
  commits?: GitCommit[];
}

export default function DetailPanel({ project: p, onClose, onToggle, onDelete, onSetServer, onAddTask, onUpdate, onClone, agents, commits }: DetailPanelProps) {
  const allAgents = agents ?? AGENTS;
  const [si, setSi] = useState(p?.serverUrl || "");
  const [gi, setGi] = useState(p?.githubUrl || "");
  const [thumb, setThumb] = useState(p?.thumbnail || "");
  const [desc, setDesc] = useState(p?.description || "");
  const [newTask, setNewTask] = useState("");
  const [aiTaskLoading, setAiTaskLoading] = useState(false);
  const [aiDescLoading, setAiDescLoading] = useState(false);
  const [aiError, setAiError] = useState("");
  const [confirmDelete, setConfirmDelete] = useState(false);
  const descTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    setSi(p?.serverUrl || "");
    setGi(p?.githubUrl || "");
    setThumb(p?.thumbnail || "");
    setDesc(p?.description || "");
  }, [p?.id]);

  useEffect(() => {
    if (descTimerRef.current) clearTimeout(descTimerRef.current);
    descTimerRef.current = setTimeout(() => {
      if (desc !== (p?.description || "")) {
        onUpdate(p.id, { description: desc || null });
      }
    }, 500);
    return () => { if (descTimerRef.current) clearTimeout(descTimerRef.current); };
  }, [desc]);

  if (!p) return null;
  const rm = ROOMS.find(r => r.key === p.room) || ROOMS[0];
  const nl = neglect(p.lastActivity, p.status);
  const done = p.tasks.filter(t => t.done).length;
  const d = daysSince(p.lastActivity);


  const submitTask = () => {
    if (!newTask.trim()) return;
    onAddTask(p.id, newTask.trim());
    setNewTask("");
  };

  const runSuggestTasks = async () => {
    setAiTaskLoading(true); setAiError("");
    try {
      const suggestions = await suggestTasks(p);
      suggestions.forEach(text => onAddTask(p.id, text));
    } catch (e) {
      setAiError((e as Error).message);
    } finally {
      setAiTaskLoading(false);
    }
  };

  const runGenerateDesc = async () => {
    setAiDescLoading(true); setAiError("");
    try {
      const result = await generateDescription(p);
      setDesc(result);
    } catch (e) {
      setAiError((e as Error).message);
    } finally {
      setAiDescLoading(false);
    }
  };

  const duration = p.startDate ? (() => {
    const start = new Date(p.startDate);
    const end = p.endDate ? new Date(p.endDate) : new Date();
    const months = Math.max(0, Math.round((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24 * 30)));
    return months < 1 ? "< 1개월" : `${months}개월`;
  })() : null;

  return (
    <div style={{
      background: "#0c0c12", borderLeft: `2px solid ${rm.color}33`, padding: 12,
      display: "flex", flexDirection: "column", gap: 8, height: "calc(100vh - 80px)", overflow: "auto",
    }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 5, marginBottom: 4 }}>
            {p.featured && <span style={{ fontFamily: PF, fontSize: 5, color: "#facc15" }}>★</span>}
            <div style={{ fontFamily: PF, fontSize: 8, color: "#ddd", lineHeight: 1.8, wordBreak: "break-word" }}>{p.name}</div>
          </div>
          {duration && <span style={{ fontFamily: PF, fontSize: 4, color: "#555" }}>{duration}</span>}
        </div>
        <div style={{ display: "flex", gap: 4, flexShrink: 0 }}>
          {onClone && (
            <button onClick={() => onClone(p)} title="프로젝트 복제" style={{
              all: "unset", cursor: "pointer", fontFamily: PF, fontSize: 6, color: "#555",
              background: "#111118", border: "1px solid #1e1e28", padding: "2px 5px",
            }}>⊕</button>
          )}
          <button onClick={() => onUpdate(p.id, { featured: !p.featured })} style={{
            all: "unset", cursor: "pointer", fontFamily: PF, fontSize: 7,
            color: p.featured ? "#facc15" : "#333",
          }}>★</button>
          <button onClick={onClose} style={{ all: "unset", cursor: "pointer", fontFamily: PF, fontSize: 8, color: "#444" }}>✕</button>
        </div>
      </div>

      <div>
        <div style={{ fontFamily: PF, fontSize: 4, color: "#555", marginBottom: 3 }}>STATUS</div>
        <div style={{ display: "flex", gap: 2, flexWrap: "wrap" }}>
          {(Object.entries(STATUS_MAP) as [ProjectStatus, { label: string; color: string }][]).map(([k, v]) => (
            <button key={k} onClick={() => onUpdate(p.id, { status: k })} style={{
              all: "unset", cursor: "pointer", fontFamily: PF, fontSize: 4, padding: "2px 6px",
              color: p.status === k ? "#000" : "#555",
              background: p.status === k ? v.color : "#111118",
              border: `1px solid ${p.status === k ? v.color : "#1e1e28"}`,
            }}>{v.label}</button>
          ))}
        </div>
      </div>

      <div>
        <div style={{ fontFamily: PF, fontSize: 4, color: "#555", marginBottom: 3 }}>PRIORITY</div>
        <div style={{ display: "flex", gap: 2 }}>
          {([["high", "HIGH", "#ef4444"], ["medium", "MED", "#facc15"], ["low", "LOW", "#4ade80"]] as [ProjectPriority, string, string][]).map(([k, l, c]) => (
            <button key={k} onClick={() => onUpdate(p.id, { priority: k })} style={{
              all: "unset", cursor: "pointer", fontFamily: PF, fontSize: 4, padding: "2px 6px",
              color: p.priority === k ? "#000" : "#555",
              background: p.priority === k ? c : "#111118",
              border: `1px solid ${p.priority === k ? c : "#1e1e28"}`,
            }}>{l}</button>
          ))}
        </div>
      </div>

      <div>
        <div style={{ fontFamily: PF, fontSize: 4, color: "#555", marginBottom: 3 }}>ROOM</div>
        <div style={{ display: "flex", gap: 2, flexWrap: "wrap" }}>
          {ROOMS.map(r => (
            <button key={r.key} onClick={() => onUpdate(p.id, { room: r.key })} style={{
              all: "unset", cursor: "pointer", fontFamily: BF, fontSize: 10, padding: "1px 5px",
              color: p.room === r.key ? "#000" : "#555",
              background: p.room === r.key ? r.color : "#111118",
              border: `1px solid ${p.room === r.key ? r.color : "#1e1e28"}`,
            }}>{r.label.split(" ")[0]}</button>
          ))}
        </div>
      </div>

      {/* AI 에이전트 배정 */}
      <div>
        <div style={{ fontFamily: PF, fontSize: 4, color: "#555", marginBottom: 3 }}>AI AGENT</div>
        <div style={{ display: "flex", gap: 2, flexWrap: "wrap" }}>
          {allAgents.map(a => {
            const isAssigned = p.assignedAgentId === a.id;
            return (
              <button key={a.id} onClick={() => onUpdate(p.id, { assignedAgentId: isAssigned ? null : a.id })}
                title={`${a.name} — ${a.role}`}
                style={{
                  all: "unset", cursor: "pointer", fontFamily: BF, fontSize: 11, padding: "2px 5px",
                  background: isAssigned ? "#1a1020" : "#111118",
                  border: `1px solid ${isAssigned ? a.body : "#1e1e28"}`,
                  color: isAssigned ? a.body : "#444",
                }}>
                {a.emoji} {a.name}
              </button>
            );
          })}
        </div>
        {p.assignedAgentId && (() => {
          const a = allAgents.find(ag => ag.id === p.assignedAgentId);
          return a ? (
            <div style={{ fontFamily: BF, fontSize: 10, color: "#555", marginTop: 3 }}>
              {a.emoji} {a.name} ({a.role}) 배정됨
            </div>
          ) : null;
        })()}
      </div>

      {/* KPI: 예산 + 마감 */}
      {(p.budget !== null || p.targetDate) && (
        <div style={{ background: "#0e0e16", border: "1px solid #1e1e2a", borderRadius: 2, padding: "6px 8px", display: "flex", flexDirection: "column", gap: 4 }}>
          <div style={{ fontFamily: PF, fontSize: 4, color: "#555", marginBottom: 1 }}>KPI</div>
          {p.budget !== null && (
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <span style={{ fontFamily: PF, fontSize: 4, color: "#888" }}>💰 예산</span>
              <span style={{ fontFamily: BF, fontSize: 11, color: "#facc15" }}>{p.budget.toLocaleString()}만원</span>
            </div>
          )}
          {p.targetDate && (() => {
            const now = new Date();
            const target = new Date(p.targetDate);
            const daysLeft = Math.ceil((target.getTime() - now.getTime()) / 864e5);
            const start = p.startDate ? new Date(p.startDate) : now;
            const total = Math.ceil((target.getTime() - start.getTime()) / 864e5);
            const elapsed = Math.max(0, Math.ceil((now.getTime() - start.getTime()) / 864e5));
            const ratio = total > 0 ? Math.min(1, elapsed / total) : 1;
            const color = daysLeft < 0 ? "#ef4444" : daysLeft < 7 ? "#f59e0b" : "#4ade80";
            return (
              <div>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 2 }}>
                  <span style={{ fontFamily: PF, fontSize: 4, color: "#888" }}>⏰ 마감</span>
                  <span style={{ fontFamily: PF, fontSize: 4, color }}>
                    {daysLeft < 0 ? `${Math.abs(daysLeft)}일 초과` : daysLeft === 0 ? "오늘!" : `D-${daysLeft}`}
                  </span>
                </div>
                <div style={{ height: 3, background: "#1a1a22" }}>
                  <div style={{ width: `${Math.round(ratio * 100)}%`, height: "100%", background: color, transition: "width .3s", boxShadow: `0 0 4px ${color}88` }} />
                </div>
                <div style={{ fontFamily: PF, fontSize: 3, color: "#333", marginTop: 1 }}>{p.targetDate}</div>
              </div>
            );
          })()}
        </div>
      )}

      {p.thumbnail ? (
        <div style={{ position: "relative", borderRadius: 3, overflow: "hidden", border: "1px solid #1a1a28" }}>
          <img src={p.thumbnail} alt={p.name} style={{ width: "100%", display: "block", maxHeight: 120, objectFit: "cover" }}
            onError={e => (e.target as HTMLImageElement).style.display = "none"} />
          <button onClick={() => onUpdate(p.id, { thumbnail: null })} style={{
            all: "unset", cursor: "pointer", position: "absolute", top: 4, right: 4,
            background: "rgba(0,0,0,.7)", color: "#ef4444", fontFamily: PF, fontSize: 6, padding: "2px 5px",
          }}>✕</button>
        </div>
      ) : (
        <div>
          <div style={{ fontFamily: PF, fontSize: 4, color: "#333", marginBottom: 2 }}>THUMBNAIL URL</div>
          <div style={{ display: "flex", gap: 3 }}>
            <input value={thumb} onChange={e => setThumb(e.target.value)} placeholder="https://..."
              onKeyDown={e => e.key === "Enter" && onUpdate(p.id, { thumbnail: thumb || null })}
              style={{ flex: 1, fontFamily: BF, fontSize: 10, color: "#666", background: "#0a0a10", border: "1px solid #1a1a22", padding: "2px 5px", outline: "none" }} />
            <button onClick={() => onUpdate(p.id, { thumbnail: thumb || null })}
              style={{ all: "unset", cursor: "pointer", fontFamily: PF, fontSize: 4, color: "#000", background: "#4ade8077", padding: "2px 4px" }}>SET</button>
          </div>
        </div>
      )}

      {aiError && (
        <div style={{ fontFamily: BF, fontSize: 10, color: "#ef4444", background: "#1a0808", border: "1px solid #ef444422", padding: "3px 6px" }}>{aiError}</div>
      )}

      <div>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 2 }}>
          <div style={{ fontFamily: PF, fontSize: 4, color: "#555" }}>DESCRIPTION <span style={{ color: "#2a2a38" }}>(자동저장)</span></div>
          {isOpenAIConfigured && (
            <button onClick={runGenerateDesc} disabled={aiDescLoading} style={{
              all: "unset", cursor: aiDescLoading ? "default" : "pointer", fontFamily: PF, fontSize: 4,
              color: "#000", background: aiDescLoading ? "#555" : "#facc15", padding: "1px 5px", opacity: aiDescLoading ? 0.7 : 1,
            }}>{aiDescLoading ? "..." : "✨ AI"}</button>
          )}
        </div>
        <textarea value={desc} onChange={e => setDesc(e.target.value)} rows={3} maxLength={200}
          placeholder="프로젝트 설명..."
          style={{ width: "100%", fontFamily: BF, fontSize: 10, color: "#aaa", background: "#0a0a10", border: "1px solid #1a1a22", padding: "4px 6px", outline: "none", resize: "vertical", boxSizing: "border-box" }} />
      </div>

      {nl > 0 && (
        <div style={{ background: nl === 2 ? "#1a0808" : "#1a1508", border: `1px solid ${nl === 2 ? "#ef4444" : "#f59e0b"}22`, padding: "4px 6px", fontFamily: PF, fontSize: 5, color: nl === 2 ? "#ef4444" : "#f59e0b" }}>
          {nl === 2 ? "🚨 7일+ 방치" : "⚠️ 3일+ 방치"} ({d}일 전)
        </div>
      )}

      {p.stack?.length > 0 && (
        <div style={{ display: "flex", flexWrap: "wrap", gap: 2 }}>
          {p.stack.map(s => (
            <span key={s} style={{ fontFamily: PF, fontSize: 4, color: "#888", background: "#1a1a1e", padding: "1px 4px", border: "1px solid #222" }}>{s}</span>
          ))}
        </div>
      )}

      <div>
        <div style={{ display: "flex", justifyContent: "space-between", fontFamily: PF, fontSize: 4, color: "#555", marginBottom: 4 }}>
          <span>PROGRESS</span><span style={{ color: rm.color }}>{p.progress}%</span>
        </div>
        <input type="range" min={0} max={100} value={p.progress}
          onChange={e => onUpdate(p.id, { progress: Number(e.target.value) })}
          style={{ width: "100%", accentColor: rm.color, cursor: "pointer" }}
        />
        <div style={{ height: 4, background: "#1a1a1e", border: "1px solid #1e1e28", marginTop: 2 }}>
          <div style={{ width: `${p.progress}%`, height: "100%", background: rm.color, transition: "width .3s", boxShadow: p.progress > 0 ? `0 0 6px ${rm.color}88` : "none" }} />
        </div>
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
        <div style={{ fontFamily: PF, fontSize: 4, color: "#555" }}>LINKS</div>
        <div>
          <div style={{ display: "flex", gap: 3 }}>
            <input value={si} onChange={e => setSi(e.target.value)} placeholder="https://myapp.vercel.app"
              onKeyDown={e => e.key === "Enter" && onSetServer(p.id, si)}
              style={{ flex: 1, fontFamily: BF, fontSize: 10, color: "#ccc", background: "#0a0a10", border: "1px solid #1a1a22", padding: "3px 5px", outline: "none" }} />
            <button onClick={() => onSetServer(p.id, si)}
              style={{ all: "unset", cursor: "pointer", fontFamily: PF, fontSize: 4, color: "#000", background: "#4ade80", padding: "2px 5px" }}>LIVE</button>
          </div>
          {p.serverUrl && (
            <button onClick={() => safeOpenUrl(p.serverUrl)} style={{
              all: "unset", cursor: "pointer", display: "flex", alignItems: "center", gap: 5,
              marginTop: 3, padding: "3px 6px", background: "#081808", border: "1px solid #4ade8033", width: "100%", boxSizing: "border-box",
            }}>
              <span style={{ fontFamily: PF, fontSize: 4, color: "#4ade80" }}>● LIVE</span>
              <span style={{ fontFamily: BF, fontSize: 10, color: "#4ade80", flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{p.serverUrl}</span>
              <span style={{ fontFamily: PF, fontSize: 4, color: "#4ade8066" }}>↗</span>
            </button>
          )}
        </div>
        <div>
          <div style={{ display: "flex", gap: 3 }}>
            <input value={gi} onChange={e => setGi(e.target.value)} placeholder="github.com/user/repo"
              onKeyDown={e => e.key === "Enter" && onUpdate(p.id, { githubUrl: gi || null })}
              style={{ flex: 1, fontFamily: BF, fontSize: 10, color: "#ccc", background: "#0a0a10", border: "1px solid #1a1a22", padding: "3px 5px", outline: "none" }} />
            <button onClick={() => onUpdate(p.id, { githubUrl: gi || null })}
              style={{ all: "unset", cursor: "pointer", fontFamily: PF, fontSize: 4, color: "#000", background: "#a78bfa", padding: "2px 4px" }}>GH</button>
          </div>
          {p.githubUrl && (
            <button onClick={() => safeOpenUrl(p.githubUrl)} style={{
              all: "unset", cursor: "pointer", display: "flex", alignItems: "center", gap: 5,
              marginTop: 3, padding: "3px 6px", background: "#0a080e", border: "1px solid #a78bfa33", width: "100%", boxSizing: "border-box",
            }}>
              <span style={{ fontFamily: PF, fontSize: 4, color: "#a78bfa" }}>⬡ GITHUB</span>
              <span style={{ fontFamily: BF, fontSize: 10, color: "#a78bfa", flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{p.githubUrl}</span>
              <span style={{ fontFamily: PF, fontSize: 4, color: "#a78bfa66" }}>↗</span>
            </button>
          )}
          {commits && commits.length > 0 && (
            <div style={{ marginTop: 5, display: "flex", flexDirection: "column", gap: 2 }}>
              <div style={{ fontFamily: PF, fontSize: 3, color: "#555", marginBottom: 1 }}>최근 커밋</div>
              {commits.slice(0, 3).map(c => (
                <button key={c.sha} onClick={() => safeOpenUrl(c.url)} style={{
                  all: "unset", cursor: "pointer", display: "flex", alignItems: "flex-start", gap: 4,
                  padding: "3px 5px", background: "#08060e", border: "1px solid #a78bfa22",
                }}>
                  <span style={{ fontFamily: PF, fontSize: 3, color: "#a78bfa88", flexShrink: 0, marginTop: 1 }}>{c.sha}</span>
                  <span style={{ fontFamily: BF, fontSize: 10, color: "#666", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", flex: 1 }}>{c.message}</span>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      <div style={{ display: "flex", gap: 5 }}>
        <div style={{ flex: 1 }}>
          <div style={{ fontFamily: PF, fontSize: 4, color: "#555", marginBottom: 2 }}>START</div>
          <input type="date" value={p.startDate || ""} onChange={e => onUpdate(p.id, { startDate: e.target.value || null })}
            style={{ width: "100%", fontFamily: BF, fontSize: 10, color: "#777", background: "#0a0a10", border: "1px solid #1a1a22", padding: "2px 4px", outline: "none", colorScheme: "dark", boxSizing: "border-box" }} />
        </div>
        <div style={{ flex: 1 }}>
          <div style={{ fontFamily: PF, fontSize: 4, color: "#555", marginBottom: 2 }}>END</div>
          <input type="date" value={p.endDate || ""} onChange={e => onUpdate(p.id, { endDate: e.target.value || null })}
            style={{ width: "100%", fontFamily: BF, fontSize: 10, color: "#777", background: "#0a0a10", border: "1px solid #1a1a22", padding: "2px 4px", outline: "none", colorScheme: "dark", boxSizing: "border-box" }} />
        </div>
      </div>

      <div>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", fontFamily: PF, fontSize: 4, color: "#555", marginBottom: 3 }}>
          <span>TASKS</span>
          <div style={{ display: "flex", gap: 5, alignItems: "center" }}>
            {isOpenAIConfigured && (
              <button onClick={runSuggestTasks} disabled={aiTaskLoading} style={{
                all: "unset", cursor: aiTaskLoading ? "default" : "pointer", fontFamily: PF, fontSize: 4,
                color: "#000", background: aiTaskLoading ? "#555" : "#facc15", padding: "1px 5px", opacity: aiTaskLoading ? 0.7 : 1,
              }}>{aiTaskLoading ? "..." : "✨ AI 제안"}</button>
            )}
            <span style={{ color: rm.color }}>{done}/{p.tasks.length}</span>
          </div>
        </div>
        {p.tasks.map((t, idx) => {
          const taskAgent = t.assignee ? allAgents.find(a => a.id === t.assignee) : null;
          const pc = t.priority === "high" ? "#ef4444" : t.priority === "medium" ? "#facc15" : t.priority === "low" ? "#4ade80" : null;
          const overdue = t.dueDate && !t.done && new Date(t.dueDate) < new Date();
          const moveTask = (dir: -1 | 1) => {
            const next = idx + dir;
            if (next < 0 || next >= p.tasks.length) return;
            const arr = [...p.tasks];
            [arr[idx], arr[next]] = [arr[next], arr[idx]];
            onUpdate(p.id, { tasks: arr });
          };
          return (
            <div key={t.id} style={{ marginBottom: 2, background: t.done ? "#080e08" : "#0c0a0a", border: `1px solid ${t.done ? "#4ade8018" : overdue ? "#ef444433" : "#1a1a22"}` }}>
              <div style={{ display: "flex", alignItems: "center", gap: 4, padding: "2px 4px" }}>
                <div style={{ display: "flex", flexDirection: "column", gap: 0, flexShrink: 0 }}>
                  <button onClick={() => moveTask(-1)} disabled={idx === 0} style={{ all: "unset", cursor: idx === 0 ? "default" : "pointer", fontFamily: PF, fontSize: 4, color: idx === 0 ? "#222" : "#555", lineHeight: 1 }}>▲</button>
                  <button onClick={() => moveTask(1)} disabled={idx === p.tasks.length - 1} style={{ all: "unset", cursor: idx === p.tasks.length - 1 ? "default" : "pointer", fontFamily: PF, fontSize: 4, color: idx === p.tasks.length - 1 ? "#222" : "#555", lineHeight: 1 }}>▼</button>
                </div>
                <button onClick={() => onToggle(p.id, t.id)} style={{ all: "unset", cursor: "pointer", display: "flex", alignItems: "center", gap: 4, flex: 1, minWidth: 0 }}>
                  <div style={{ width: 7, height: 7, border: `1px solid ${t.done ? "#4ade80" : "#333"}`, background: "#0a0a0c", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                    {t.done && <span style={{ color: "#4ade80", fontSize: 5, fontFamily: PF }}>✓</span>}
                  </div>
                  {pc && <div style={{ width: 4, height: 4, borderRadius: "50%", background: pc, flexShrink: 0 }} />}
                  <span style={{ fontFamily: BF, fontSize: 10, color: t.done ? "#4a8a4a" : overdue ? "#ef4444" : "#999", textDecoration: t.done ? "line-through" : "none", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{t.text}</span>
                </button>
                {taskAgent && <span title={taskAgent.name} style={{ fontSize: 9, flexShrink: 0 }}>{taskAgent.emoji}</span>}
                {t.dueDate && <span style={{ fontFamily: PF, fontSize: 3, color: overdue ? "#ef4444" : "#444", flexShrink: 0 }}>{t.dueDate.slice(5)}</span>}
                <button
                  onClick={() => onUpdate(p.id, { tasks: p.tasks.filter(t2 => t2.id !== t.id) })}
                  title="삭제"
                  style={{ all: "unset", cursor: "pointer", fontFamily: PF, fontSize: 5, color: "#333", padding: "0 2px", flexShrink: 0, lineHeight: 1 }}
                  onMouseEnter={e => (e.currentTarget.style.color = "#ef4444")}
                  onMouseLeave={e => (e.currentTarget.style.color = "#333")}
                >✕</button>
              </div>
            </div>
          );
        })}
        <div style={{ display: "flex", gap: 3, marginTop: 4 }}>
          <input value={newTask} onChange={e => setNewTask(e.target.value)} onKeyDown={e => e.key === "Enter" && submitTask()}
            placeholder="+ 새 태스크..." style={{ flex: 1, fontFamily: BF, fontSize: 10, color: "#666", background: "#0a0a0c", border: "1px solid #1a1a22", padding: "2px 5px", outline: "none" }} />
          <button onClick={submitTask} style={{ all: "unset", cursor: "pointer", fontFamily: PF, fontSize: 4, color: "#000", background: "#4ade8077", padding: "2px 5px" }}>+</button>
        </div>
      </div>

      <div style={{ fontFamily: PF, fontSize: 3, color: "#333", lineHeight: 1.8 }}>
        LAST: {p.lastActivity}
      </div>

      {confirmDelete ? (
        <div style={{ marginTop: "auto", background: "#1a0808", border: "1px solid #ef444444", padding: "8px" }}>
          <div style={{ fontFamily: BF, fontSize: 11, color: "#ef4444", marginBottom: 6, textAlign: "center" }}>정말 삭제할까요?</div>
          <div style={{ display: "flex", gap: 4 }}>
            <button onClick={() => { onDelete(p.id); setConfirmDelete(false); }} style={{
              all: "unset", cursor: "pointer", flex: 1, fontFamily: PF, fontSize: 5, color: "#fff",
              background: "#ef4444", padding: "5px", textAlign: "center",
            }}>삭제</button>
            <button onClick={() => setConfirmDelete(false)} style={{
              all: "unset", cursor: "pointer", flex: 1, fontFamily: PF, fontSize: 5, color: "#aaa",
              background: "#1e1e28", padding: "5px", textAlign: "center", border: "1px solid #333",
            }}>취소</button>
          </div>
        </div>
      ) : (
        <button onClick={() => setConfirmDelete(true)} style={{
          all: "unset", cursor: "pointer", fontFamily: PF, fontSize: 6, color: "#ef4444",
          background: "#120808", padding: "6px", textAlign: "center", marginTop: "auto", border: "1px solid #ef444422",
        }}>DELETE PROJECT</button>
      )}
    </div>
  );
}
