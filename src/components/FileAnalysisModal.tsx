import { useState } from "react";
import { PF, BF, ROOMS, STATUS_MAP } from "../data/constants";
import { analyzeProjectWithAI, isOpenAIConfigured } from "../lib/openai";
import type { Project, ProjectStatus, ProjectPriority, RoomKey, Task } from "../types";
import type { FileAnalysisResult } from "../utils/helpers";

interface FileAnalysisModalProps {
  analysis: FileAnalysisResult;
  filename: string;
  rawContent: string;
  onConfirm: (p: Project) => void;
  onClose: () => void;
}

export default function FileAnalysisModal({ analysis, filename, rawContent, onConfirm, onClose }: FileAnalysisModalProps) {
  const [name,      setName]      = useState(analysis.name || "");
  const [room,      setRoom]      = useState<RoomKey>((analysis.room as RoomKey) || "lab");
  const [status,    setStatus]    = useState<ProjectStatus>("active");
  const [priority,  setPriority]  = useState<ProjectPriority>((analysis.priority as ProjectPriority) || "medium");
  const [serverUrl, setServerUrl] = useState("");
  const [tasks,     setTasks]     = useState<Task[]>(analysis.tasks || []);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiError,   setAiError]   = useState("");

  const inp: React.CSSProperties = { width: "100%", fontFamily: BF, fontSize: 12, color: "#ccc", background: "#0c0c10", border: "1px solid #222", padding: "5px 7px", outline: "none", boxSizing: "border-box" };
  const lbl: React.CSSProperties = { fontFamily: PF, fontSize: 5, color: "#555", marginBottom: 3 };

  const toggleTask = (id: string) => setTasks(t => t.map(x => x.id === id ? { ...x, done: !x.done } : x));
  const removeTask = (id: string) => setTasks(t => t.filter(x => x.id !== id));
  const addTask    = () => setTasks(t => [...t, { id: `t${Date.now()}`, text: "", done: false }]);
  const updateTask = (id: string, val: string) => setTasks(t => t.map(x => x.id === id ? { ...x, text: val } : x));

  const runAI = async () => {
    if (!rawContent) return;
    setAiLoading(true); setAiError("");
    try {
      const result = await analyzeProjectWithAI(rawContent, filename);
      if (result.name) setName(result.name);
      if (result.room) setRoom(result.room as RoomKey);
      if (result.priority) setPriority(result.priority as ProjectPriority);
      if (result.tasks?.length) setTasks(result.tasks.map((text, i) => ({ id: `t${Date.now()}${i}`, text, done: false })));
    } catch (e) {
      setAiError((e as Error).message);
    } finally {
      setAiLoading(false);
    }
  };

  const confirm = () => {
    if (!name.trim()) return;
    const finalTasks = tasks.filter(t => t.text.trim());
    onConfirm({
      id: Date.now(), name: name.trim(), status,
      progress: Math.round(finalTasks.filter(t => t.done).length / Math.max(finalTasks.length, 1) * 100),
      priority, lastActivity: new Date().toISOString().slice(0, 10),
      room, serverUrl: serverUrl.trim() || null,
      githubUrl: null, thumbnail: null, description: null,
      featured: false, startDate: null, endDate: null,
      tasks: finalTasks, stack: analysis.stack || [],
    });
    onClose();
  };

  const PRIORITIES: { k: ProjectPriority; l: string; c: string }[] = [
    { k: "high", l: "HIGH", c: "#ef4444" },
    { k: "medium", l: "MED",  c: "#facc15" },
    { k: "low",  l: "LOW",  c: "#4ade80" },
  ];

  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,.92)", zIndex: 1000, display: "flex", alignItems: "center", justifyContent: "center", padding: "20px 0", overflowY: "auto" }}
      onClick={onClose}>
      <div onClick={e => e.stopPropagation()} style={{ width: 360, background: "#0e0e12", border: "2px solid #4ade8044", padding: 16, display: "flex", flexDirection: "column", gap: 10 }}>

        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div style={{ fontFamily: BF, fontSize: 14, color: "#4ade80", fontWeight: "bold" }}>📂 파일 분석</div>
          {isOpenAIConfigured && (
            <button onClick={runAI} disabled={aiLoading} style={{
              all: "unset", cursor: aiLoading ? "default" : "pointer",
              fontFamily: BF, fontSize: 12, fontWeight: "bold", color: "#000",
              background: aiLoading ? "#555" : "#facc15",
              padding: "3px 10px", opacity: aiLoading ? 0.7 : 1,
            }}>
              {aiLoading ? "AI 분석 중..." : "✨ GPT 분석"}
            </button>
          )}
        </div>
        {aiError && <div style={{ fontFamily: BF, fontSize: 11, color: "#ef4444", background: "#1a0808", border: "1px solid #ef444422", padding: "4px 6px" }}>{aiError}</div>}

        <div style={{ background: "#0a1a0a", border: "1px solid #4ade8022", padding: "6px 8px", borderRadius: 2 }}>
          <div style={{ fontFamily: PF, fontSize: 4, color: "#4ade80", marginBottom: 3 }}>DETECTED</div>
          <div style={{ fontFamily: BF, fontSize: 11, color: "#aaa" }}>{analysis.detected}</div>
          {analysis.version && <div style={{ fontFamily: PF, fontSize: 4, color: "#555", marginTop: 2 }}>v{analysis.version}</div>}
          {analysis.stack?.length > 0 && (
            <div style={{ display: "flex", gap: 3, flexWrap: "wrap", marginTop: 4 }}>
              {analysis.stack.map(s => (
                <span key={s} style={{ fontFamily: PF, fontSize: 4, color: "#60a5fa", background: "#0a1020", padding: "1px 4px", border: "1px solid #60a5fa33" }}>{s}</span>
              ))}
            </div>
          )}
        </div>

        <div>
          <div style={lbl}>PROJECT NAME</div>
          <input value={name} onChange={e => setName(e.target.value)} style={inp} autoFocus />
        </div>

        <div style={{ display: "flex", gap: 10 }}>
          <div style={{ flex: 1 }}>
            <div style={lbl}>STATUS</div>
            <div style={{ display: "flex", gap: 2, flexWrap: "wrap" }}>
              {(Object.entries(STATUS_MAP) as [ProjectStatus, { label: string; color: string }][]).map(([k, v]) => (
                <button key={k} onClick={() => setStatus(k)} style={{
                  all: "unset", cursor: "pointer", fontFamily: PF, fontSize: 4, padding: "2px 4px",
                  color: status === k ? "#000" : "#555",
                  background: status === k ? v.color : "#1a1a1e",
                  border: `1px solid ${status === k ? v.color : "#222"}`,
                }}>{v.label}</button>
              ))}
            </div>
          </div>
          <div>
            <div style={lbl}>PRIORITY</div>
            <div style={{ display: "flex", gap: 2 }}>
              {PRIORITIES.map(p => (
                <button key={p.k} onClick={() => setPriority(p.k)} style={{
                  all: "unset", cursor: "pointer", fontFamily: PF, fontSize: 4, padding: "2px 4px",
                  color: priority === p.k ? "#000" : "#555",
                  background: priority === p.k ? p.c : "#1a1a1e",
                  border: `1px solid ${priority === p.k ? p.c : "#222"}`,
                }}>{p.l}</button>
              ))}
            </div>
          </div>
        </div>

        <div>
          <div style={lbl}>ROOM</div>
          <div style={{ display: "flex", gap: 2, flexWrap: "wrap" }}>
            {ROOMS.map(rm => (
              <button key={rm.key} onClick={() => setRoom(rm.key)} style={{
                all: "unset", cursor: "pointer", fontFamily: BF, fontSize: 11, padding: "2px 6px",
                color: room === rm.key ? "#000" : "#555",
                background: room === rm.key ? rm.color : "#1a1a1e",
                border: `1px solid ${room === rm.key ? rm.color : "#222"}`,
              }}>{rm.label.split(" ")[0]}</button>
            ))}
          </div>
        </div>

        <div>
          <div style={lbl}>DEPLOYED URL (선택)</div>
          <input value={serverUrl} onChange={e => setServerUrl(e.target.value)} placeholder="https://myapp.vercel.app" style={inp} />
        </div>

        <div>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 4 }}>
            <div style={{ fontFamily: BF, fontSize: 12, color: "#facc15", fontWeight: "bold" }}>⚡ 추천 할 일 ({tasks.length})</div>
            <button onClick={addTask} style={{ all: "unset", cursor: "pointer", fontFamily: BF, fontSize: 12, color: "#4ade80" }}>+ 추가</button>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 3, maxHeight: 200, overflowY: "auto" }}>
            {tasks.map(t => (
              <div key={t.id} style={{ display: "flex", alignItems: "center", gap: 4 }}>
                <button onClick={() => toggleTask(t.id)} style={{
                  all: "unset", cursor: "pointer", width: 12, height: 12, flexShrink: 0,
                  border: `1px solid ${t.done ? "#4ade80" : "#333"}`,
                  background: t.done ? "#4ade8022" : "#0a0a0c",
                  display: "flex", alignItems: "center", justifyContent: "center",
                }}>
                  {t.done && <span style={{ fontFamily: PF, fontSize: 4, color: "#4ade80" }}>✓</span>}
                </button>
                <input value={t.text} onChange={e => updateTask(t.id, e.target.value)} style={{
                  ...inp, flex: 1,
                  color: t.done ? "#4a6a4a" : "#bbb",
                  textDecoration: t.done ? "line-through" : "none",
                  padding: "3px 5px",
                }} />
                <button onClick={() => removeTask(t.id)} style={{ all: "unset", cursor: "pointer", fontFamily: BF, fontSize: 14, color: "#333" }}>×</button>
              </div>
            ))}
          </div>
        </div>

        <div style={{ display: "flex", gap: 6, marginTop: 4 }}>
          <button onClick={confirm} style={{ all: "unset", cursor: "pointer", flex: 1, fontFamily: BF, fontSize: 14, fontWeight: "bold", color: "#000", background: "#4ade80", padding: 7, textAlign: "center" }}>
            프로젝트 등록
          </button>
          <button onClick={onClose} style={{ all: "unset", cursor: "pointer", flex: 1, fontFamily: BF, fontSize: 14, color: "#555", background: "#1a1a1e", padding: 7, textAlign: "center", border: "1px solid #222" }}>
            취소
          </button>
        </div>
      </div>
    </div>
  );
}
