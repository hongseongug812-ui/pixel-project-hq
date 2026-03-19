import { useState } from "react";
import { PF, BF, ROOMS, STATUS_MAP } from "../data/constants";

export default function AddModal({ onAdd, onClose }) {
  const [name,        setName]        = useState("");
  const [room,        setRoom]        = useState("lab");
  const [serverUrl,   setServerUrl]   = useState("");
  const [githubUrl,   setGithubUrl]   = useState("");
  const [thumbnail,   setThumbnail]   = useState("");
  const [description, setDescription] = useState("");
  const [status,      setStatus]      = useState("active");
  const [priority,    setPriority]    = useState("medium");
  const [featured,    setFeatured]    = useState(false);
  const [startDate,   setStartDate]   = useState(new Date().toISOString().slice(0, 10));
  const [stackInput,  setStackInput]  = useState("");
  const [tasks,       setTasks]       = useState([{ text: "", done: false }]);

  const inp = { width: "100%", fontFamily: BF, fontSize: 12, color: "#ccc", background: "#0c0c10", border: "1px solid #222", padding: "5px 7px", outline: "none", boxSizing: "border-box" };
  const lbl = { fontFamily: PF, fontSize: 5, color: "#555", marginBottom: 3 };

  const addTask    = () => setTasks(t => [...t, { text: "", done: false }]);
  const updateTask = (i, val) => setTasks(t => t.map((x, idx) => idx === i ? { ...x, text: val } : x));
  const removeTask = (i) => setTasks(t => t.filter((_, idx) => idx !== i));

  const submit = () => {
    if (!name.trim()) return;
    const stack = stackInput.split(",").map(s => s.trim()).filter(Boolean);
    const finalTasks = tasks.filter(t => t.text.trim()).map((t, i) => ({ id: `t${Date.now()}${i}`, text: t.text.trim(), done: t.done }));
    if (finalTasks.length === 0) finalTasks.push({ id: `t${Date.now()}`, text: "초기 세팅", done: false });
    onAdd({
      id: Date.now(), name: name.trim(), status, priority,
      progress: Math.round(finalTasks.filter(t => t.done).length / finalTasks.length * 100),
      lastActivity: new Date().toISOString().slice(0, 10),
      room, serverUrl: serverUrl.trim() || null,
      githubUrl: githubUrl.trim() || null,
      thumbnail: thumbnail.trim() || null,
      description: description.trim() || null,
      featured, startDate, endDate: null, tasks: finalTasks, stack,
    });
    onClose();
  };

  const PRIORITIES = [
    { k: "high", l: "HIGH", c: "#ef4444" },
    { k: "medium", l: "MED",  c: "#facc15" },
    { k: "low",  l: "LOW",  c: "#4ade80" },
  ];

  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,.9)", zIndex: 1000, display: "flex", alignItems: "center", justifyContent: "center", overflowY: "auto", padding: "20px 0" }}
      onClick={onClose}>
      <div onClick={e => e.stopPropagation()} style={{ width: 350, background: "#0e0e12", border: "2px solid #facc1533", padding: 16, display: "flex", flexDirection: "column", gap: 9 }}>

        {/* 헤더 */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div style={{ fontFamily: PF, fontSize: 7, color: "#facc15" }}>+ NEW PROJECT</div>
          <button onClick={() => setFeatured(f => !f)} style={{
            all: "unset", cursor: "pointer", fontFamily: BF, fontSize: 12,
            color: featured ? "#facc15" : "#333",
            background: featured ? "#1a1808" : "#111",
            border: `1px solid ${featured ? "#facc1544" : "#222"}`,
            padding: "2px 8px",
          }}>★ {featured ? "FEATURED" : "FEATURE"}</button>
        </div>

        {/* 이름 */}
        <div>
          <div style={lbl}>PROJECT NAME *</div>
          <input value={name} onChange={e => setName(e.target.value)} placeholder="프로젝트 이름" style={inp} autoFocus onKeyDown={e => e.key === "Enter" && submit()} />
        </div>

        {/* 설명 */}
        <div>
          <div style={lbl}>DESCRIPTION</div>
          <textarea value={description} onChange={e => setDescription(e.target.value)} placeholder="프로젝트 한 줄 소개..." rows={2}
            style={{ ...inp, resize: "vertical" }} />
        </div>

        {/* 상태 + 우선순위 */}
        <div style={{ display: "flex", gap: 10 }}>
          <div style={{ flex: 1 }}>
            <div style={lbl}>STATUS</div>
            <div style={{ display: "flex", gap: 2, flexWrap: "wrap" }}>
              {Object.entries(STATUS_MAP).map(([k, v]) => (
                <button key={k} onClick={() => setStatus(k)} style={{
                  all: "unset", cursor: "pointer", fontFamily: PF, fontSize: 4, padding: "2px 5px",
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
                  all: "unset", cursor: "pointer", fontFamily: PF, fontSize: 4, padding: "2px 5px",
                  color: priority === p.k ? "#000" : "#555",
                  background: priority === p.k ? p.c : "#1a1a1e",
                  border: `1px solid ${priority === p.k ? p.c : "#222"}`,
                }}>{p.l}</button>
              ))}
            </div>
          </div>
        </div>

        {/* 방 */}
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

        {/* 날짜 */}
        <div>
          <div style={lbl}>START DATE</div>
          <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} style={{ ...inp, colorScheme: "dark" }} />
        </div>

        {/* 스택 */}
        <div>
          <div style={lbl}>TECH STACK (쉼표로 구분)</div>
          <input value={stackInput} onChange={e => setStackInput(e.target.value)} placeholder="React, Node, Python..." style={inp} />
        </div>

        {/* 썸네일 */}
        <div>
          <div style={lbl}>THUMBNAIL URL (선택)</div>
          <input value={thumbnail} onChange={e => setThumbnail(e.target.value)} placeholder="https://..." style={inp} />
        </div>

        {/* 링크 */}
        <div style={{ display: "flex", gap: 6 }}>
          <div style={{ flex: 1 }}>
            <div style={lbl}>LIVE URL</div>
            <input value={serverUrl} onChange={e => setServerUrl(e.target.value)} placeholder="myapp.vercel.app" style={inp} />
          </div>
          <div style={{ flex: 1 }}>
            <div style={lbl}>GITHUB</div>
            <input value={githubUrl} onChange={e => setGithubUrl(e.target.value)} placeholder="github.com/..." style={inp} />
          </div>
        </div>

        {/* 태스크 */}
        <div>
          <div style={{ ...lbl, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <span>TASKS</span>
            <button onClick={addTask} style={{ all: "unset", cursor: "pointer", fontFamily: PF, fontSize: 4, color: "#4ade80" }}>+ ADD</button>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 3 }}>
            {tasks.map((t, i) => (
              <div key={i} style={{ display: "flex", gap: 4, alignItems: "center" }}>
                <input value={t.text} onChange={e => updateTask(i, e.target.value)} placeholder={`태스크 ${i + 1}`} style={{ ...inp, flex: 1 }} />
                {tasks.length > 1 && (
                  <button onClick={() => removeTask(i)} style={{ all: "unset", cursor: "pointer", fontFamily: BF, fontSize: 14, color: "#ef4444" }}>×</button>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* 버튼 */}
        <div style={{ display: "flex", gap: 6, marginTop: 2 }}>
          <button onClick={submit} style={{ all: "unset", cursor: "pointer", flex: 1, fontFamily: BF, fontSize: 14, fontWeight: "bold", color: "#000", background: "#4ade80", padding: 7, textAlign: "center" }}>생성</button>
          <button onClick={onClose} style={{ all: "unset", cursor: "pointer", flex: 1, fontFamily: BF, fontSize: 14, color: "#555", background: "#1a1a1e", padding: 7, textAlign: "center", border: "1px solid #222" }}>취소</button>
        </div>
      </div>
    </div>
  );
}
