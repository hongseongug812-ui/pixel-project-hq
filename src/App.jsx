import { useState, useEffect, useMemo, useCallback } from "react";
import { PF, BF, ROOMS } from "./data/constants";
import { analyzeFile } from "./utils/helpers";
import { useAuth } from "./contexts/AuthContext";
import { isConfigured } from "./lib/supabase";
import { supabase } from "./lib/supabase";
import { rowToProject } from "./lib/db";
import * as db from "./lib/db";

import { useProjects }    from "./hooks/useProjects";
import { useLogs }        from "./hooks/useLogs";
import { useAgents }      from "./hooks/useAgents";
import { useServerStats } from "./hooks/useServerStats";

import OfficeRoom         from "./components/OfficeRoom";
import LeftSidebar        from "./components/LeftSidebar";
import DetailPanel        from "./components/DetailPanel";
import AddModal           from "./components/AddModal";
import FileAnalysisModal  from "./components/FileAnalysisModal";
import PortfolioView      from "./components/PortfolioView";
import AuthModal          from "./components/AuthModal";
import Toast              from "./components/Toast";

// ── localStorage fallback ─────────────────────────────────────────────
const KEY = "phq6";
const loadLocal = () => { try { return JSON.parse(localStorage.getItem(KEY) || "[]"); } catch { return []; } };

export default function App() {
  const { user, loading: authLoading, signOut, isConfigured: cfgd } = useAuth();

  // ── Hooks ────────────────────────────────────────────────────────────
  const { logs, pushLog, initLogs } = useLogs();
  const { projects, setProjects, loadingData, saving, loadProjects, syncLocal, addProject, deleteProject, updateProject, toggleTask, addTask } = useProjects(user, pushLog);
  const { agentState, tick } = useAgents(projects, pushLog);
  const { serverStats } = useServerStats(projects, tick);

  // ── UI State ─────────────────────────────────────────────────────────
  const [selId,        setSelId]        = useState(null);
  const [filter,       setFilter]       = useState("all");
  const [viewMode,     setViewMode]     = useState("god");
  const [showAdd,      setShowAdd]      = useState(false);
  const [dropActive,   setDropActive]   = useState(false);
  const [fileAnalysis, setFileAnalysis] = useState(null);
  const [migrateBanner,setMigrateBanner]= useState(false);
  const [toasts,       setToasts]       = useState([]);

  // ── Toast helper ─────────────────────────────────────────────────────
  const toast = useCallback((msg, type = "success", emoji = "✓") => {
    const id = Date.now();
    setToasts(p => [...p.slice(-4), { id, msg, type, emoji }]);
    setTimeout(() => setToasts(p => p.filter(t => t.id !== id)), 3000);
  }, []);

  // ── 데이터 로드 ──────────────────────────────────────────────────────
  useEffect(() => {
    if (authLoading) return;
    loadProjects();
    if (isConfigured && user) {
      const local = localStorage.getItem(KEY);
      try { if (local && JSON.parse(local).length > 0) setMigrateBanner(true); } catch {}
    }
  }, [user, authLoading]);

  // ── localStorage 자동 저장 (오프라인) ────────────────────────────────
  useEffect(() => { syncLocal(projects); }, [projects]);

  // ── Realtime 구독 ────────────────────────────────────────────────────
  useEffect(() => {
    if (!isConfigured || !user) return;
    const ch = supabase.channel("projects-rt")
      .on("postgres_changes", { event: "*", schema: "public", table: "projects", filter: `user_id=eq.${user.id}` }, payload => {
        if (payload.eventType === "INSERT") {
          setProjects(p => p.find(x => x.id === payload.new.id) ? p : [rowToProject(payload.new), ...p]);
        } else if (payload.eventType === "UPDATE") {
          setProjects(p => p.map(x => x.id === payload.new.id ? { ...x, ...rowToProject(payload.new) } : x));
        } else if (payload.eventType === "DELETE") {
          setProjects(p => p.filter(x => x.id !== payload.old.id));
        }
      }).subscribe();
    return () => supabase.removeChannel(ch);
  }, [user]);

  // ── 부트 로그 ────────────────────────────────────────────────────────
  useEffect(() => { initLogs(); }, []);

  // ── 키보드 단축키 ────────────────────────────────────────────────────
  useEffect(() => {
    const handler = (e) => {
      if (e.key === "Escape") {
        setShowAdd(false);
        setFileAnalysis(null);
        setSelId(null);
      }
      if ((e.ctrlKey || e.metaKey) && e.key === "n") {
        e.preventDefault();
        setShowAdd(true);
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);

  // ── 마이그레이션 ─────────────────────────────────────────────────────
  const handleMigrate = useCallback(async () => {
    if (!user) return;
    const count = await db.migrateFromLocalStorage(user.id);
    if (count > 0) {
      const refreshed = await db.fetchProjects(user.id);
      setProjects(refreshed);
      toast(`로컬 데이터 ${count}개 가져오기 완료`, "success", "📦");
      pushLog(`로컬 데이터 ${count}개 마이그레이션 완료`, "📦", "#4ade80");
    }
    setMigrateBanner(false);
  }, [user]);

  // ── 서버 URL 설정 ─────────────────────────────────────────────────────
  const setSrv = useCallback((id, url) => {
    const fields = { serverUrl: url || null, room: url ? "server" : (projects.find(p => p.id === id)?.room || "lab") };
    updateProject(id, fields);
    if (url) { pushLog(`서버 등록: ${url}`, "🚀", "#4ade80"); toast("서버 URL 등록됨", "success", "🚀"); }
  }, [updateProject, projects]);

  // ── 파일 드롭 ────────────────────────────────────────────────────────
  const handleDrop = useCallback(e => {
    e.preventDefault(); setDropActive(false);
    const f = e.dataTransfer.files[0];
    if (!f) return;
    const r = new FileReader();
    r.onload = ev => {
      const content = ev.target.result;
      const analysis = analyzeFile(content, f.name);
      if (analysis) setFileAnalysis({ analysis, filename: f.name, rawContent: content });
      else toast("지원하지 않는 파일 형식입니다", "warn", "⚠️");
    };
    r.readAsText(f);
  }, []);

  // ── Export ────────────────────────────────────────────────────────────
  const exportJSON = useCallback(() => {
    const blob = new Blob([JSON.stringify(projects, null, 2)], { type: "application/json" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `pixel-hq-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    toast("JSON 백업 완료", "success", "↓");
  }, [projects]);

  const exportHTML = useCallback(() => {
    const SC = { active: "#4ade80", pivot: "#facc15", complete: "#60a5fa", paused: "#a78bfa" };
    const cards = projects.map(p => {
      const sc = SC[p.status] || "#888";
      const stack = (p.stack || []).map(s => `<span style="font-size:10px;color:${sc};background:${sc}18;padding:2px 7px;border:1px solid ${sc}33;font-family:monospace">${s}</span>`).join(" ");
      const live = p.serverUrl ? `<a href="${p.serverUrl.startsWith("http") ? p.serverUrl : "https://" + p.serverUrl}" target="_blank" style="font-size:11px;color:#000;background:#4ade80;padding:4px 10px;text-decoration:none;font-family:monospace">LIVE ↗</a>` : "";
      const gh = p.githubUrl ? `<a href="${p.githubUrl.startsWith("http") ? p.githubUrl : "https://" + p.githubUrl}" target="_blank" style="font-size:11px;color:#a78bfa;background:#a78bfa18;padding:4px 10px;text-decoration:none;font-family:monospace;border:1px solid #a78bfa33">GitHub ↗</a>` : "";
      const thumb = p.thumbnail ? `<img src="${p.thumbnail}" style="width:100%;height:140px;object-fit:cover;display:block"/>` : `<div style="height:80px;background:linear-gradient(135deg,${sc}18,${sc}06);display:flex;align-items:center;justify-content:center;font-size:28px;color:${sc};opacity:.5;font-family:monospace">${p.name.slice(0,2).toUpperCase()}</div>`;
      return `<div style="background:#0e0e14;border:1px solid ${p.featured ? "#facc1533" : "#1a1a28"};border-radius:6px;overflow:hidden">${p.featured ? '<div style="background:#facc1518;padding:4px 10px;font-size:10px;color:#facc15;font-family:monospace;border-bottom:1px solid #facc1522">★ FEATURED</div>' : ""}${thumb}<div style="padding:14px"><div style="display:flex;justify-content:space-between;margin-bottom:6px"><div style="font-family:monospace;font-size:13px;color:#ddd;font-weight:bold">${p.name}</div><span style="font-size:9px;color:${sc};background:${sc}22;padding:2px 6px;font-family:monospace">${p.status.toUpperCase()}</span></div>${p.description ? `<div style="font-size:12px;color:#888;margin-bottom:8px">${p.description}</div>` : ""}<div style="display:flex;flex-wrap:wrap;gap:4px;margin-bottom:10px">${stack}</div><div style="height:3px;background:#1a1a22;margin-bottom:10px"><div style="width:${p.progress}%;height:100%;background:${sc}"></div></div><div style="display:flex;gap:6px">${live}${gh}</div></div></div>`;
    }).join("\n");
    const html = `<!DOCTYPE html><html lang="ko"><head><meta charset="UTF-8"><title>Portfolio</title><style>*{box-sizing:border-box;margin:0;padding:0}body{background:#0d0d12;color:#ccc;font-family:sans-serif;padding:40px 20px}h1{font-family:monospace;font-size:28px;color:#facc15;letter-spacing:4px;margin-bottom:32px}.grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(280px,1fr));gap:16px}</style></head><body><h1>⬤ PORTFOLIO</h1><div class="grid">${cards}</div></body></html>`;
    const blob = new Blob([html], { type: "text/html" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `portfolio-${new Date().toISOString().slice(0, 10)}.html`;
    a.click();
    toast("HTML 포트폴리오 내보내기 완료", "success", "↓");
  }, [projects]);

  // ── Derived ───────────────────────────────────────────────────────────
  const filtered  = useMemo(() => projects.filter(p => filter === "all" || p.status === filter), [projects, filter]);
  const grouped   = useMemo(() => { const g = {}; filtered.forEach(p => { if (!g[p.room]) g[p.room] = []; g[p.room].push(p); }); return g; }, [filtered]);
  const sel       = projects.find(p => p.id === selId) || null;
  const negl      = projects.filter(p => p.status !== "complete" && Math.floor((Date.now() - new Date(p.lastActivity)) / 864e5) >= 3).length;
  const liveCount = projects.filter(p => p.serverUrl).length;

  // ── 로딩 화면 ─────────────────────────────────────────────────────────
  if (authLoading || loadingData) {
    return (
      <div style={{ minHeight: "100vh", background: "#0d0d12", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 16 }}>
        <link href="https://fonts.googleapis.com/css2?family=Press+Start+2P&display=swap" rel="stylesheet" />
        <div style={{ fontFamily: "'Press Start 2P',monospace", fontSize: 12, color: "#facc15", textShadow: "0 0 20px #facc1566" }}>
          <span style={{ color: "#ef4444" }}>⬤</span> PIXEL HQ
        </div>
        <div style={{ fontFamily: "'Press Start 2P',monospace", fontSize: 5, color: "#333" }}>
          {authLoading ? "인증 확인 중..." : "데이터 로딩 중..."}
        </div>
        <div style={{ display: "flex", gap: 4, marginTop: 8 }}>
          {[0,1,2].map(i => <div key={i} style={{ width: 6, height: 6, background: "#facc15", animation: `blink 1.2s ${i * 0.3}s steps(2) infinite` }} />)}
        </div>
        <style>{`@keyframes blink { 50%{opacity:0} }`}</style>
      </div>
    );
  }

  // ── Auth 화면 ─────────────────────────────────────────────────────────
  if (isConfigured && !user) {
    return (
      <>
        <link href="https://fonts.googleapis.com/css2?family=Press+Start+2P&family=DotGothic16&display=swap" rel="stylesheet" />
        <AuthModal onMigrate={handleMigrate} />
      </>
    );
  }

  // ── 메인 앱 ───────────────────────────────────────────────────────────
  return (
    <div
      onDragOver={e => { e.preventDefault(); setDropActive(true); }}
      onDragLeave={() => setDropActive(false)}
      onDrop={handleDrop}
      style={{ minHeight: "100vh", background: "#0d0d12", fontFamily: BF }}
    >
      <link href="https://fonts.googleapis.com/css2?family=Press+Start+2P&family=DotGothic16&family=Noto+Sans+KR:wght@400&display=swap" rel="stylesheet" />
      <style>{`
        @keyframes blink { 50% { opacity: 0; } }
        ::-webkit-scrollbar { width: 4px; height: 4px; }
        ::-webkit-scrollbar-track { background: #0a0a10; }
        ::-webkit-scrollbar-thumb { background: #2a2a38; border-radius: 2px; }
        body { zoom: 1.35; }
        button:active { opacity: 0.7; transform: scale(0.97); }
      `}</style>

      {/* 마이그레이션 배너 */}
      {migrateBanner && (
        <div style={{ background: "#0a1a0a", borderBottom: "1px solid #4ade8033", padding: "7px 14px", display: "flex", alignItems: "center", gap: 10 }}>
          <span style={{ fontFamily: BF, fontSize: 12, color: "#4ade80" }}>📦 로컬 데이터 감지됨</span>
          <span style={{ fontFamily: BF, fontSize: 12, color: "#666", flex: 1 }}>이전에 저장한 프로젝트를 클라우드로 가져올까요?</span>
          <button onClick={handleMigrate} style={{ all: "unset", cursor: "pointer", fontFamily: BF, fontSize: 12, fontWeight: "bold", color: "#000", background: "#4ade80", padding: "3px 10px" }}>가져오기</button>
          <button onClick={() => { setMigrateBanner(false); localStorage.removeItem(KEY); }} style={{ all: "unset", cursor: "pointer", fontFamily: BF, fontSize: 12, color: "#555", padding: "3px 8px" }}>무시</button>
        </div>
      )}

      {dropActive && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(250,204,21,.05)", zIndex: 998, display: "flex", alignItems: "center", justifyContent: "center", pointerEvents: "none", border: "2px dashed #facc1533" }}>
          <div style={{ fontFamily: PF, fontSize: 10, color: "#facc15", textShadow: "0 0 20px #facc15" }}>📂 파일을 놓으세요</div>
        </div>
      )}

      {/* Header */}
      <header style={{ padding: "8px 14px", borderBottom: "1px solid #1a1a28", display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 6, background: "#0a0a10" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <span style={{ fontFamily: PF, fontSize: 9, color: "#facc15", letterSpacing: 2, textShadow: "0 0 10px #facc1566" }}>
            <span style={{ color: "#ef4444" }}>⬤</span> PIXEL HQ
          </span>
          <div style={{ display: "flex", alignItems: "center", gap: 3 }}>
            <div style={{ width: 5, height: 5, borderRadius: "50%", background: isConfigured ? "#4ade80" : "#f59e0b", boxShadow: `0 0 5px ${isConfigured ? "#4ade80" : "#f59e0b"}` }} />
            <span style={{ fontFamily: PF, fontSize: 4, color: isConfigured ? "#4ade8088" : "#f59e0b88" }}>{isConfigured ? "CLOUD" : "LOCAL"}</span>
          </div>
          {saving && <span style={{ fontFamily: BF, fontSize: 11, color: "#60a5fa" }}>저장 중...</span>}
          {liveCount > 0 && (
            <div style={{ display: "flex", alignItems: "center", gap: 3 }}>
              <div style={{ width: 5, height: 5, borderRadius: "50%", background: "#4ade80", boxShadow: "0 0 5px #4ade80" }} />
              <span style={{ fontFamily: PF, fontSize: 4, color: "#4ade80" }}>{liveCount} LIVE</span>
            </div>
          )}
        </div>
        <div style={{ display: "flex", gap: 4, alignItems: "center", flexWrap: "wrap" }}>
          {[
            ["PRJ", projects.length, "#60a5fa"],
            ["ACTIVE", projects.filter(p => p.status === "active" || p.status === "pivot").length, "#4ade80"],
            ["WARN", negl, negl ? "#ef4444" : "#2a2a38"],
            ["SRV", liveCount, liveCount ? "#a78bfa" : "#2a2a38"],
          ].map(([l, v, c]) => (
            <div key={l} style={{ background: "#0e0e16", padding: "2px 7px", border: `1px solid ${c}22`, display: "flex", alignItems: "center", gap: 4 }}>
              <span style={{ fontFamily: PF, fontSize: 4, color: "#333" }}>{l}</span>
              <span style={{ fontFamily: PF, fontSize: 8, color: c }}>{v}</span>
            </div>
          ))}
          {user && (
            <div style={{ display: "flex", alignItems: "center", gap: 5, marginLeft: 4 }}>
              <span style={{ fontFamily: BF, fontSize: 11, color: "#444" }}>{user.email?.split("@")[0]}</span>
              <button onClick={signOut} style={{ all: "unset", cursor: "pointer", fontFamily: PF, fontSize: 4, color: "#444", background: "#111118", border: "1px solid #1e1e28", padding: "2px 5px" }}>OUT</button>
            </div>
          )}
        </div>
      </header>

      {/* Toolbar */}
      <div style={{ padding: "5px 14px", borderBottom: "1px solid #141420", display: "flex", gap: 3, alignItems: "center", flexWrap: "wrap", background: "#0c0c14" }}>
        <div style={{ display: "flex", marginRight: 6, border: "1px solid #1e1e28" }}>
          {[["god", "🏢 GOD"], ["portfolio", "📋 FOLIO"]].map(([v, l]) => (
            <button key={v} onClick={() => setViewMode(v)} style={{
              all: "unset", cursor: "pointer", fontFamily: PF, fontSize: 4, padding: "4px 9px",
              color: viewMode === v ? "#000" : "#444",
              background: viewMode === v ? "#facc15" : "#111118",
            }}>{l}</button>
          ))}
        </div>
        {viewMode === "god" && [
          { k: "all", l: "ALL" }, { k: "active", l: "ACTIVE" }, { k: "pivot", l: "PIVOT" },
          { k: "paused", l: "PAUSED" }, { k: "complete", l: "DONE" }
        ].map(f => (
          <button key={f.k} onClick={() => setFilter(f.k)} style={{
            all: "unset", cursor: "pointer", fontFamily: PF, fontSize: 5, padding: "3px 7px",
            color: filter === f.k ? "#000" : "#444",
            background: filter === f.k ? "#facc15" : "#111118",
            border: `1px solid ${filter === f.k ? "#b89a0d" : "#1e1e28"}`,
          }}>{f.l}</button>
        ))}
        <div style={{ flex: 1 }} />
        <button onClick={() => setShowAdd(true)} style={{ all: "unset", cursor: "pointer", fontFamily: BF, fontSize: 13, fontWeight: "bold", color: "#000", background: "#4ade80", padding: "3px 11px", boxShadow: "0 0 8px #4ade8044" }}>
          + 추가
        </button>
        <span style={{ fontFamily: BF, fontSize: 11, color: "#1e1e2e" }}>Ctrl+N · ESC로 닫기</span>
      </div>

      {/* Main */}
      <div style={{ display: "flex", minHeight: "calc(100vh - 76px)" }}>
        {viewMode === "god" && (
          <LeftSidebar projects={projects} agentState={agentState} logs={logs} serverStats={serverStats} />
        )}

        {viewMode === "god" ? (
          <div style={{ flex: 1, padding: 12, overflow: "auto" }}>
            {projects.length === 0 ? (
              <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", height: "60vh", gap: 12 }}>
                <div style={{ fontFamily: BF, fontSize: 18, color: "#333" }}>프로젝트 없음</div>
                <div style={{ fontFamily: BF, fontSize: 13, color: "#2a2a38" }}>+ 추가 버튼 또는 파일을 드래그해서 시작하세요</div>
                <button onClick={() => setShowAdd(true)} style={{ all: "unset", cursor: "pointer", fontFamily: BF, fontSize: 14, fontWeight: "bold", color: "#000", background: "#4ade80", padding: "8px 20px", marginTop: 8 }}>
                  첫 프로젝트 추가
                </button>
              </div>
            ) : (
              <div style={{ display: "flex", flexWrap: "wrap", gap: 10 }}>
                {ROOMS.map(rm => (
                  <OfficeRoom key={rm.key} roomCfg={rm} projects={grouped[rm.key] || []}
                    agents={agentState.filter(a => a.room === rm.key)} selectedId={selId}
                    onSelect={id => setSelId(selId === id ? null : id)} />
                ))}
              </div>
            )}
          </div>
        ) : (
          <PortfolioView projects={projects}
            onSelect={id => { setSelId(id); setViewMode("god"); }}
            onExportJSON={exportJSON} onExportHTML={exportHTML} />
        )}

        {sel && viewMode === "god" && (
          <div style={{ width: 265, flexShrink: 0 }}>
            <DetailPanel project={sel} onClose={() => setSelId(null)}
              onToggle={toggleTask} onDelete={deleteProject}
              onSetServer={setSrv} onAddTask={addTask} onUpdate={updateProject} />
          </div>
        )}
      </div>

      {showAdd && <AddModal onAdd={addProject} onClose={() => setShowAdd(false)} />}
      {fileAnalysis && (
        <FileAnalysisModal analysis={fileAnalysis.analysis} filename={fileAnalysis.filename}
          rawContent={fileAnalysis.rawContent}
          onConfirm={addProject} onClose={() => setFileAnalysis(null)} />
      )}
      <Toast toasts={toasts} />
    </div>
  );
}
