import { useState, useEffect, useRef } from "react";
import { PF, BF, STATUS_MAP, ROOMS } from "../data/constants";
import { neglect, daysSince } from "../utils/helpers";
import { suggestTasks, generateDescription, isOpenAIConfigured } from "../lib/openai";
import type { Project, ProjectStatus, ProjectPriority } from "../types";

interface DetailPanelProps {
  project: Project;
  onClose: () => void;
  onToggle: (pid: number | string, tid: string) => void;
  onDelete: (id: number | string) => void;
  onSetServer: (id: number | string, url: string) => void;
  onAddTask: (pid: number | string, text: string) => void;
  onUpdate: (id: number | string, fields: Partial<Project>) => void;
  onClone?: (p: Project) => void;
}

export default function DetailPanel({ project: p, onClose, onToggle, onDelete, onSetServer, onAddTask, onUpdate, onClone }: DetailPanelProps) {
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

  const openUrl = (url: string | null) => {
    if (!url) return;
    const full = url.startsWith("http") ? url : `https://${url}`;
    try {
      const parsed = new URL(full);
      if (parsed.protocol !== "http:" && parsed.protocol !== "https:") return;
      window.open(parsed.href, "_blank", "noopener,noreferrer");
    } catch { /* invalid URL */ }
  };

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
            <button onClick={() => openUrl(p.serverUrl)} style={{
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
            <button onClick={() => openUrl(p.githubUrl)} style={{
              all: "unset", cursor: "pointer", display: "flex", alignItems: "center", gap: 5,
              marginTop: 3, padding: "3px 6px", background: "#0a080e", border: "1px solid #a78bfa33", width: "100%", boxSizing: "border-box",
            }}>
              <span style={{ fontFamily: PF, fontSize: 4, color: "#a78bfa" }}>⬡ GITHUB</span>
              <span style={{ fontFamily: BF, fontSize: 10, color: "#a78bfa", flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{p.githubUrl}</span>
              <span style={{ fontFamily: PF, fontSize: 4, color: "#a78bfa66" }}>↗</span>
            </button>
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
        {p.tasks.map(t => (
          <button key={t.id} onClick={() => onToggle(p.id, t.id)} style={{
            all: "unset", cursor: "pointer", display: "flex", alignItems: "center", gap: 5,
            padding: "2px 4px", marginBottom: 1, width: "100%",
            background: t.done ? "#080e08" : "#0c0a0a", border: `1px solid ${t.done ? "#4ade8018" : "#1a1a22"}`,
          }}>
            <div style={{ width: 7, height: 7, border: `1px solid ${t.done ? "#4ade80" : "#333"}`, background: "#0a0a0c", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
              {t.done && <span style={{ color: "#4ade80", fontSize: 5, fontFamily: PF }}>✓</span>}
            </div>
            <span style={{ fontFamily: BF, fontSize: 10, color: t.done ? "#4a8a4a" : "#999", textDecoration: t.done ? "line-through" : "none" }}>{t.text}</span>
          </button>
        ))}
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
