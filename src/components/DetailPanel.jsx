import { useState, useEffect } from "react";
import { PF, BF, STATUS_MAP, ROOMS } from "../data/constants";
import { neglect, daysSince } from "../utils/helpers";
import { suggestTasks, generateDescription, isOpenAIConfigured } from "../lib/openai";

export default function DetailPanel({ project: p, onClose, onToggle, onDelete, onSetServer, onAddTask, onUpdate }) {
  const [si, setSi] = useState(p?.serverUrl || "");
  const [gi, setGi] = useState(p?.githubUrl || "");
  const [thumb, setThumb] = useState(p?.thumbnail || "");
  const [desc, setDesc] = useState(p?.description || "");
  const [editingDesc, setEditingDesc] = useState(false);
  const [newTask, setNewTask] = useState("");
  const [aiTaskLoading, setAiTaskLoading] = useState(false);
  const [aiDescLoading, setAiDescLoading] = useState(false);
  const [aiError, setAiError] = useState("");

  useEffect(() => {
    setSi(p?.serverUrl || "");
    setGi(p?.githubUrl || "");
    setThumb(p?.thumbnail || "");
    setDesc(p?.description || "");
    setEditingDesc(false);
  }, [p?.id]);

  if (!p) return null;
  const st = STATUS_MAP[p.status];
  const rm = ROOMS.find(r => r.key === p.room) || ROOMS[0];
  const nl = neglect(p.lastActivity, p.status);
  const done = p.tasks.filter(t => t.done).length;
  const d = daysSince(p.lastActivity);

  const openUrl = (url) => {
    const full = url.startsWith("http") ? url : `https://${url}`;
    window.open(full, "_blank", "noopener,noreferrer");
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
      setAiError(e.message);
    } finally {
      setAiTaskLoading(false);
    }
  };

  const runGenerateDesc = async () => {
    setAiDescLoading(true); setAiError("");
    try {
      const result = await generateDescription(p);
      setDesc(result);
      save("description", result);
    } catch (e) {
      setAiError(e.message);
    } finally {
      setAiDescLoading(false);
    }
  };

  const save = (field, val) => onUpdate(p.id, { [field]: val || null });

  const PRIORITY_COLORS = { high: "#ef4444", medium: "#facc15", low: "#4ade80" };
  const pc = PRIORITY_COLORS[p.priority] || "#555";

  const duration = p.startDate ? (() => {
    const start = new Date(p.startDate);
    const end = p.endDate ? new Date(p.endDate) : new Date();
    const months = Math.max(0, Math.round((end - start) / (1000 * 60 * 60 * 24 * 30)));
    return months < 1 ? "< 1개월" : `${months}개월`;
  })() : null;

  return (
    <div style={{
      background: "#0c0c12", borderLeft: `2px solid ${rm.color}33`, padding: 12,
      display: "flex", flexDirection: "column", gap: 8, height: "calc(100vh - 76px)", overflow: "auto",
    }}>
      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 5, marginBottom: 3 }}>
            {p.featured && <span style={{ fontFamily: PF, fontSize: 5, color: "#facc15" }}>★</span>}
            <div style={{ fontFamily: PF, fontSize: 8, color: "#ddd", lineHeight: 1.8, wordBreak: "break-word" }}>{p.name}</div>
          </div>
          <div style={{ display: "flex", gap: 4, alignItems: "center", flexWrap: "wrap" }}>
            <span style={{ fontFamily: PF, fontSize: 4, color: st.color, background: st.color + "22", padding: "1px 4px" }}>{st.label}</span>
            <span style={{ fontFamily: PF, fontSize: 4, color: pc, background: pc + "18", padding: "1px 4px" }}>{p.priority?.toUpperCase()}</span>
            {duration && <span style={{ fontFamily: PF, fontSize: 4, color: "#555", padding: "1px 3px" }}>{duration}</span>}
          </div>
        </div>
        <div style={{ display: "flex", gap: 4, flexShrink: 0 }}>
          <button onClick={() => onUpdate(p.id, { featured: !p.featured })} style={{
            all: "unset", cursor: "pointer", fontFamily: PF, fontSize: 7,
            color: p.featured ? "#facc15" : "#333",
          }}>★</button>
          <button onClick={onClose} style={{ all: "unset", cursor: "pointer", fontFamily: PF, fontSize: 8, color: "#444" }}>✕</button>
        </div>
      </div>

      {/* Thumbnail */}
      {p.thumbnail && (
        <div style={{ borderRadius: 3, overflow: "hidden", border: "1px solid #1a1a28" }}>
          <img src={p.thumbnail} alt={p.name} style={{ width: "100%", display: "block", maxHeight: 120, objectFit: "cover" }}
            onError={e => e.target.style.display = "none"} />
        </div>
      )}

      {/* Thumbnail input */}
      {!p.thumbnail && (
        <div>
          <div style={{ fontFamily: PF, fontSize: 4, color: "#333", marginBottom: 2 }}>THUMBNAIL URL</div>
          <div style={{ display: "flex", gap: 3 }}>
            <input value={thumb} onChange={e => setThumb(e.target.value)} placeholder="https://..."
              style={{ flex: 1, fontFamily: BF, fontSize: 10, color: "#666", background: "#0a0a10", border: "1px solid #1a1a22", padding: "2px 5px", outline: "none" }} />
            <button onClick={() => save("thumbnail", thumb)}
              style={{ all: "unset", cursor: "pointer", fontFamily: PF, fontSize: 4, color: "#000", background: "#4ade8077", padding: "2px 4px" }}>SET</button>
          </div>
        </div>
      )}

      {/* AI Error */}
      {aiError && (
        <div style={{ fontFamily: BF, fontSize: 10, color: "#ef4444", background: "#1a0808", border: "1px solid #ef444422", padding: "3px 6px" }}>{aiError}</div>
      )}

      {/* Description */}
      <div>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 2 }}>
          <div style={{ fontFamily: PF, fontSize: 4, color: "#555" }}>DESCRIPTION</div>
          <div style={{ display: "flex", gap: 4 }}>
            {isOpenAIConfigured && (
              <button onClick={runGenerateDesc} disabled={aiDescLoading} style={{
                all: "unset", cursor: aiDescLoading ? "default" : "pointer", fontFamily: PF, fontSize: 4,
                color: "#000", background: aiDescLoading ? "#555" : "#facc15", padding: "1px 5px", opacity: aiDescLoading ? 0.7 : 1,
              }}>{aiDescLoading ? "..." : "✨ AI"}</button>
            )}
            <button onClick={() => { if (editingDesc) save("description", desc); setEditingDesc(e => !e); }}
              style={{ all: "unset", cursor: "pointer", fontFamily: PF, fontSize: 5, color: editingDesc ? "#4ade80" : "#333" }}>
              {editingDesc ? "SAVE" : "EDIT"}
            </button>
          </div>
        </div>
        {editingDesc ? (
          <textarea value={desc} onChange={e => setDesc(e.target.value)} rows={3}
            style={{ width: "100%", fontFamily: BF, fontSize: 10, color: "#aaa", background: "#0a0a10", border: "1px solid #4ade8033", padding: "4px 6px", outline: "none", resize: "vertical", boxSizing: "border-box" }} />
        ) : (
          <div onClick={() => setEditingDesc(true)} style={{ fontFamily: BF, fontSize: 10, color: p.description ? "#888" : "#333", background: "#0a0a0c", border: "1px solid #1a1a1e", padding: "4px 6px", minHeight: 36, cursor: "text", borderRadius: 2 }}>
            {p.description || "클릭해서 설명 추가..."}
          </div>
        )}
      </div>

      {/* Neglect alert */}
      {nl > 0 && (
        <div style={{ background: nl === 2 ? "#1a0808" : "#1a1508", border: `1px solid ${nl === 2 ? "#ef4444" : "#f59e0b"}22`, padding: "4px 6px", fontFamily: PF, fontSize: 5, color: nl === 2 ? "#ef4444" : "#f59e0b" }}>
          {nl === 2 ? "🚨 7일+ 방치" : "⚠️ 3일+ 방치"} ({d}일 전)
        </div>
      )}

      {/* Stack */}
      <div style={{ display: "flex", flexWrap: "wrap", gap: 2 }}>
        {p.stack?.map(s => (
          <span key={s} style={{ fontFamily: PF, fontSize: 4, color: "#888", background: "#1a1a1e", padding: "1px 4px", border: "1px solid #222" }}>{s}</span>
        ))}
      </div>

      {/* Progress */}
      <div>
        <div style={{ display: "flex", justifyContent: "space-between", fontFamily: PF, fontSize: 4, color: "#555", marginBottom: 2 }}>
          <span>PROGRESS</span><span style={{ color: rm.color }}>{p.progress}%</span>
        </div>
        <div style={{ height: 5, background: "#1a1a1e", border: "1px solid #1e1e28" }}>
          <div style={{ width: `${p.progress}%`, height: "100%", background: rm.color, transition: "width .3s", boxShadow: p.progress > 0 ? `0 0 6px ${rm.color}88` : "none" }} />
        </div>
      </div>

      {/* Links section */}
      <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
        <div style={{ fontFamily: PF, fontSize: 4, color: "#555" }}>LINKS</div>

        {/* Live URL */}
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

        {/* GitHub URL */}
        <div>
          <div style={{ display: "flex", gap: 3 }}>
            <input value={gi} onChange={e => setGi(e.target.value)} placeholder="github.com/user/repo"
              onKeyDown={e => e.key === "Enter" && save("githubUrl", gi)}
              style={{ flex: 1, fontFamily: BF, fontSize: 10, color: "#ccc", background: "#0a0a10", border: "1px solid #1a1a22", padding: "3px 5px", outline: "none" }} />
            <button onClick={() => save("githubUrl", gi)}
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

      {/* Date range */}
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

      {/* Tasks */}
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

      {/* Meta */}
      <div style={{ fontFamily: PF, fontSize: 3, color: "#333", lineHeight: 1.8 }}>
        ROOM: <span style={{ color: rm.color }}>{rm.label}</span><br />
        LAST: {p.lastActivity}
      </div>

      {/* Delete */}
      <button onClick={() => onDelete(p.id)} style={{
        all: "unset", cursor: "pointer", fontFamily: PF, fontSize: 6, color: "#ef4444",
        background: "#120808", padding: "6px", textAlign: "center", marginTop: "auto", border: "1px solid #ef444422",
      }}>DELETE PROJECT</button>
    </div>
  );
}
