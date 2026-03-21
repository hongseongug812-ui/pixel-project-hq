import { useState, useEffect, useMemo, useCallback } from "react";
import { PF, BF } from "./data/constants";
import { useAuth } from "./contexts/AuthContext";
import { isConfigured, supabase } from "./lib/supabase";
import { rowToProject } from "./lib/db";

import { useProjects }    from "./hooks/useProjects";
import { useLogs }        from "./contexts/LogsContext";
import { useAgents }      from "./hooks/useAgents";
import { useServerStats } from "./hooks/useServerStats";
import { useToast }       from "./hooks/useToast";
import { useExport }      from "./hooks/useExport";
import { useFileDrop }    from "./hooks/useFileDrop";
import { useMigration }   from "./hooks/useMigration";
import { useUndoDelete }  from "./hooks/useUndoDelete";
import { useAIChat }      from "./hooks/useAIChat";
import { useAIScheduler } from "./hooks/useAIScheduler";
import { useAlertWatcher } from "./hooks/useAlertWatcher";
import { useAutoPilot }   from "./hooks/useAutoPilot";
import { useCompanyFeed } from "./hooks/useCompanyFeed";
import { useCustomAgents } from "./hooks/useCustomAgents";
import { useGitHub }      from "./hooks/useGitHub";

import OfficePlan         from "./components/OfficePlan";
import LeftSidebar        from "./components/LeftSidebar";
import DetailPanel        from "./components/DetailPanel";
import AddModal           from "./components/AddModal";
import FileAnalysisModal  from "./components/FileAnalysisModal";
import PortfolioView      from "./components/PortfolioView";
import AuthModal          from "./components/AuthModal";
import Toast              from "./components/Toast";
import AIChat             from "./components/AIChat";
import MyPage             from "./components/MyPage";
import AgentChat          from "./components/AgentChat";
import KanbanView         from "./components/KanbanView";
import AppHeader          from "./components/AppHeader";
import AppToolbar         from "./components/AppToolbar";
import CompanyFeed        from "./components/CompanyFeed";
import HireModal          from "./components/HireModal";
import StatsView          from "./components/StatsView";
import AlertSettingsModal from "./components/AlertSettingsModal";

import type { Project } from "./types";
import type { SortKey } from "./components/AppToolbar";

export default function App() {
  const { user, loading: authLoading, isDemo, signOut, enterDemo, exitDemo } = useAuth();
  const { pushLog, initLogs }   = useLogs();
  const { toasts, setToasts, toast } = useToast();

  const [selId,        setSelIdState] = useState<number | string | null>(null);
  const [filter,       setFilter]     = useState("all");
  const [search,       setSearch]     = useState("");
  const [viewMode,     setViewMode]   = useState("god");
  const [sort,         setSort]        = useState<SortKey>("lastActivity");
  const [showAdd,      setShowAdd]    = useState(false);
  const [showStats,    setShowStats]  = useState(false);
  const [showAlerts,   setShowAlerts] = useState(false);
  const [showSidebar,  setShowSidebar] = useState(true);
  const [showMyPage,   setShowMyPage]  = useState(false);
  const [aiChatOpen,   setAiChatOpen]  = useState(false);
  const [agentChatId,  setAgentChatId] = useState<string | null>(null);
  const [showHire,     setShowHire]    = useState(false);
  const [hideComplete, setHideComplete] = useState(false);

  const { projects, setProjects, loadingData, saving, loadProjects, syncLocal, addProject, deleteProject, updateProject, toggleTask, addTask } = useProjects(user, toast, isDemo);
  const { agentState, tick, isMeetingActive } = useAgents(projects, aiChatOpen);
  const { serverStats, pingHistory, pinging, recheckServer } = useServerStats(projects, tick);
  const { exportJSON, exportHTML } = useExport(projects, toast);
  const { dropActive, setDropActive, fileAnalysis, setFileAnalysis, handleDrop } = useFileDrop(toast);
  const { migrateBanner, checkLocalData, handleMigrate, dismissMigrate } = useMigration(user, setProjects, toast, pushLog);
  const { handleDelete, handleUndo } = useUndoDelete(projects, deleteProject, addProject, setToasts, toast, setSelId);
  useAlertWatcher(projects);
  useAutoPilot(projects, serverStats, updateProject, addTask);
  const { messages: aiMessages, loading: aiLoading, send: aiSend, clear: aiClear, pushAIMessage } = useAIChat(
    projects,
    { updateProject, addProject, deleteProject, toggleTask, addTask },
    toast,
  );
  useAIScheduler(projects, pushAIMessage, toast);
  const { messages: feedMessages, postAsMe, postCEOAnnouncement, clearFeed } = useCompanyFeed(projects);
  const { allAgents, addAgent, removeAgent } = useCustomAgents();
  const { commitMap } = useGitHub(projects);

  // setSelId wrapper so useUndoDelete can call it
  function setSelId(id: number | string | null) { setSelIdState(id); }

  // ── boot ──────────────────────────────────────────────────────────────
  useEffect(() => {
    if (authLoading) return;
    loadProjects();
    if (isConfigured && user) checkLocalData();
  }, [user, authLoading]);

  useEffect(() => { syncLocal(projects); }, [projects]);
  useEffect(() => { initLogs(); }, []);

  // ── Supabase realtime ─────────────────────────────────────────────────
  useEffect(() => {
    if (!isConfigured || !user || !supabase) return;
    const ch = supabase.channel("projects-rt")
      .on("postgres_changes", { event: "*", schema: "public", table: "projects", filter: `user_id=eq.${user.id}` },
        (payload: { eventType: string; new: Record<string, unknown>; old: Record<string, unknown> }) => {
          if (payload.eventType === "INSERT") {
            setProjects(p => p.find(x => x.id === (payload.new as { id: unknown }).id) ? p : [rowToProject(payload.new as Parameters<typeof rowToProject>[0]), ...p]);
          } else if (payload.eventType === "UPDATE") {
            setProjects(p => p.map(x => x.id === (payload.new as { id: unknown }).id ? { ...x, ...rowToProject(payload.new as Parameters<typeof rowToProject>[0]) } : x));
          } else if (payload.eventType === "DELETE") {
            setProjects(p => p.filter(x => x.id !== (payload.old as { id: unknown }).id));
          }
        }
      ).subscribe();
    return () => { supabase!.removeChannel(ch); };
  }, [user]);

  // ── keyboard shortcuts ────────────────────────────────────────────────
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") { setShowAdd(false); setFileAnalysis(null); setSelIdState(null); }
      if ((e.ctrlKey || e.metaKey) && e.key === "n") { e.preventDefault(); setShowAdd(true); }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);

  // ── clone ─────────────────────────────────────────────────────────────
  const cloneProject = useCallback((p: Project) => {
    addProject({
      ...p,
      id: Date.now(),
      name: `${p.name} (복사본)`,
      tasks: p.tasks.map((t, i) => ({ ...t, id: `t${Date.now()}${i}`, done: false })),
      progress: 0,
      lastActivity: new Date().toISOString().slice(0, 10),
      featured: false,
    });
    toast(`"${p.name}" 복제 완료`, "success", "⊕");
  }, [addProject, toast]);

  // ── server URL ────────────────────────────────────────────────────────
  const setSrv = useCallback((id: number | string, url: string) => {
    updateProject(id, { serverUrl: url || null, room: url ? "server" : (projects.find(p => p.id === id)?.room || "lab") });
    if (url) { pushLog(`서버 등록: ${url}`, "🚀", "#4ade80"); toast("서버 URL 등록됨", "success", "🚀"); }
  }, [updateProject, projects, pushLog, toast]);

  // ── derived state ─────────────────────────────────────────────────────
  const PRIORITY_ORDER: Record<string, number> = { high: 0, medium: 1, low: 2 };
  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    const base = projects.filter(p =>
      (filter === "all" || p.status === filter) &&
      !(hideComplete && p.status === "complete" && filter === "all") &&
      (!q || p.name.toLowerCase().includes(q) ||
             (p.description || "").toLowerCase().includes(q) ||
             (p.stack || []).some(s => s.toLowerCase().includes(q)) ||
             p.tasks.some(t => t.text.toLowerCase().includes(q)))
    );
    return [...base].sort((a, b) => {
      switch (sort) {
        case "priority":     return (PRIORITY_ORDER[a.priority] ?? 2) - (PRIORITY_ORDER[b.priority] ?? 2);
        case "progress":     return b.progress - a.progress;
        case "name":         return a.name.localeCompare(b.name, "ko");
        case "targetDate":   return (a.targetDate ?? "9999") < (b.targetDate ?? "9999") ? -1 : 1;
        case "health":       return b.progress - a.progress; // approximation without server stats here
        default:             return (b.lastActivity ?? "").localeCompare(a.lastActivity ?? ""); // lastActivity
      }
    });
  }, [projects, filter, search, sort, hideComplete]);

  const grouped = useMemo(() => {
    const g: Record<string, Project[]> = {};
    filtered.forEach(p => { if (!g[p.room]) g[p.room] = []; g[p.room].push(p); });
    return g;
  }, [filtered]);

  const sel       = projects.find(p => p.id === selId) ?? null;
  const negl      = projects.filter(p => p.status !== "complete" && Math.floor((Date.now() - new Date(p.lastActivity).getTime()) / 864e5) >= 3).length;
  const liveCount = projects.filter(p => p.serverUrl).length;

  // ── loading screen ────────────────────────────────────────────────────
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
          {[0, 1, 2].map(i => <div key={i} style={{ width: 6, height: 6, background: "#facc15", animation: `blink 1.2s ${i * 0.3}s steps(2) infinite` }} />)}
        </div>
        <style>{`@keyframes blink { 50%{opacity:0} }`}</style>
      </div>
    );
  }

  // ── auth screen ───────────────────────────────────────────────────────
  if (isConfigured && !user && !isDemo) {
    return (
      <>
        <link href="https://fonts.googleapis.com/css2?family=Press+Start+2P&family=DotGothic16&display=swap" rel="stylesheet" />
        <AuthModal onMigrate={handleMigrate} onDemo={enterDemo} />
      </>
    );
  }

  // ── main app ──────────────────────────────────────────────────────────
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
        button:active { opacity: 0.7; transform: scale(0.97); }
        @media (max-width: 768px) {
          .phq-sidebar { display: none !important; }
          .phq-sidebar-visible { display: flex !important; }
          .phq-detail { display: none !important; }
          .phq-filters { display: none !important; }
          .phq-search { width: 120px !important; }
          .phq-toolbar-views { display: none !important; }
          .phq-mobile-tabs { display: flex !important; }
          .phq-main { padding-bottom: 56px !important; }
          .phq-office-wrap { overflow-x: auto !important; }
          .phq-mobile-sheet { display: flex !important; }
        }
        .phq-mobile-sheet {
          display: none;
          position: fixed; bottom: 52px; left: 0; right: 0;
          max-height: 70vh; background: #0a0a12;
          border-top: 1px solid #facc1533;
          z-index: 600; overflow-y: auto;
          animation: slideUp 0.2s ease-out;
        }
        @keyframes slideUp { from { transform: translateY(100%); } to { transform: translateY(0); } }
        .phq-mobile-tabs { display: none; }
      `}</style>

      {/* Demo banner */}
      {isDemo && (
        <div style={{ background: "#0e0a00", borderBottom: "1px solid #facc1544", padding: "6px 14px", display: "flex", alignItems: "center", gap: 10 }}>
          <span style={{ fontFamily: PF, fontSize: 5, color: "#facc15" }}>▶ DEMO MODE</span>
          <span style={{ fontFamily: BF, fontSize: 12, color: "#666", flex: 1 }}>변경사항은 저장되지 않습니다. 샘플 데이터로 자유롭게 탐색해보세요.</span>
          <button onClick={exitDemo} style={{ all: "unset", cursor: "pointer", fontFamily: BF, fontSize: 12, fontWeight: "bold", color: "#000", background: "#facc15", padding: "3px 12px" }}>로그인하기</button>
        </div>
      )}

      {/* Migration banner */}
      {migrateBanner && (
        <div style={{ background: "#0a1a0a", borderBottom: "1px solid #4ade8033", padding: "7px 14px", display: "flex", alignItems: "center", gap: 10 }}>
          <span style={{ fontFamily: BF, fontSize: 12, color: "#4ade80" }}>📦 로컬 데이터 감지됨</span>
          <span style={{ fontFamily: BF, fontSize: 12, color: "#666", flex: 1 }}>이전에 저장한 프로젝트를 클라우드로 가져올까요?</span>
          <button onClick={handleMigrate} style={{ all: "unset", cursor: "pointer", fontFamily: BF, fontSize: 12, fontWeight: "bold", color: "#000", background: "#4ade80", padding: "3px 10px" }}>가져오기</button>
          <button onClick={dismissMigrate} style={{ all: "unset", cursor: "pointer", fontFamily: BF, fontSize: 12, color: "#555", padding: "3px 8px" }}>무시</button>
        </div>
      )}

      {/* Drop overlay */}
      {dropActive && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(250,204,21,.05)", zIndex: 998, display: "flex", alignItems: "center", justifyContent: "center", pointerEvents: "none", border: "2px dashed #facc1533" }}>
          <div style={{ fontFamily: PF, fontSize: 10, color: "#facc15", textShadow: "0 0 20px #facc15" }}>📂 파일을 놓으세요</div>
        </div>
      )}

      <AppHeader
        user={user}
        saving={saving}
        projectCount={projects.length}
        activeCount={projects.filter(p => p.status === "active" || p.status === "pivot").length}
        neglectCount={negl}
        liveCount={liveCount}
        onMyPage={() => setShowMyPage(true)}
        onSignOut={signOut}
      />
      <AppToolbar
        viewMode={viewMode}
        filter={filter}
        search={search}
        sort={sort}
        showSidebar={showSidebar}
        hideComplete={hideComplete}
        onViewMode={setViewMode}
        onFilter={setFilter}
        onSearch={setSearch}
        onSort={setSort}
        onToggleSidebar={() => setShowSidebar(s => !s)}
        onToggleHideComplete={() => setHideComplete(h => !h)}
        onAdd={() => { setShowAdd(true); setFileAnalysis(null); }}
        onHire={() => setShowHire(true)}
        onStats={() => setShowStats(true)}
      />

      {/* Main */}
      <div className="phq-main" style={{ display: "flex", minHeight: "calc(100vh - 80px)" }}>
        {viewMode === "god" && showSidebar && (
          <div className={`phq-sidebar${showSidebar ? " phq-sidebar-visible" : ""}`} style={{ display: "flex" }}>
            <LeftSidebar
              projects={projects}
              agentState={agentState}
              serverStats={serverStats}
              pingHistory={pingHistory}
              pinging={pinging}
              onSelectProject={setSelId}
              onRecheckServer={recheckServer}
              onRemoveServer={id => setSrv(id, "")}
              onRemoveAgent={removeAgent}
              onAlertSettings={() => setShowAlerts(true)}
            />
          </div>
        )}

        {viewMode === "god" ? (
          <div className="phq-office-wrap" style={{ flex: 1, padding: 12, overflow: "auto" }}>
            {projects.length === 0 ? (
              <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", height: "60vh", gap: 12 }}>
                <div style={{ fontFamily: BF, fontSize: 18, color: "#333" }}>프로젝트 없음</div>
                <div style={{ fontFamily: BF, fontSize: 13, color: "#2a2a38" }}>+ 추가 버튼 또는 파일을 드래그해서 시작하세요</div>
                <button onClick={() => setShowAdd(true)} style={{ all: "unset", cursor: "pointer", fontFamily: BF, fontSize: 14, fontWeight: "bold", color: "#000", background: "#4ade80", padding: "8px 20px", marginTop: 8 }}>첫 프로젝트 추가</button>
              </div>
            ) : filtered.length === 0 ? (
              <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", height: "60vh", gap: 10 }}>
                <div style={{ fontFamily: PF, fontSize: 20, color: "#2a2a38" }}>🔍</div>
                <div style={{ fontFamily: BF, fontSize: 15, color: "#333" }}>{search ? `"${search}" 검색 결과 없음` : `'${filter}' 상태의 프로젝트 없음`}</div>
                <button onClick={() => { setSearch(""); setFilter("all"); }} style={{ all: "unset", cursor: "pointer", fontFamily: BF, fontSize: 12, color: "#facc15", border: "1px solid #facc1533", padding: "4px 12px", marginTop: 4 }}>필터 초기화</button>
              </div>
            ) : (
              <OfficePlan
                grouped={grouped}
                agentState={agentState}
                selectedId={selId}
                isMeetingActive={isMeetingActive}
                serverStats={serverStats}
                searchQuery={search.trim().toLowerCase()}
                onSelect={(id: number | string) => setSelIdState(selId === id ? null : id)}
                onAgentClick={(id: string) => setAgentChatId(prev => prev === id ? null : id)}
              />
            )}
          </div>
        ) : viewMode === "kanban" ? (
          <KanbanView projects={projects} serverStats={serverStats} onSelect={id => { setSelIdState(id); setViewMode("god"); }} />
        ) : viewMode === "feed" ? (
          <CompanyFeed
            messages={feedMessages}
            onPostAsMe={postAsMe}
            onPostAnnouncement={postCEOAnnouncement}
            onClear={clearFeed}
          />
        ) : (
          <PortfolioView projects={projects} onSelect={id => { setSelIdState(id); setViewMode("god"); }} onExportJSON={exportJSON} onExportHTML={exportHTML} />
        )}

        {sel && viewMode === "god" && (
          <>
            {/* Desktop: right sidebar */}
            <div className="phq-detail" style={{ width: 265, flexShrink: 0 }}>
              <DetailPanel project={sel} onClose={() => setSelIdState(null)}
                onToggle={toggleTask} onDelete={handleDelete} onClone={cloneProject}
                onSetServer={setSrv} onAddTask={addTask} onUpdate={updateProject}
                agents={allAgents}
                commits={commitMap[sel.id]}
              />
            </div>
            {/* Mobile: slide-up sheet */}
            <div className="phq-mobile-sheet">
              <DetailPanel project={sel} onClose={() => setSelIdState(null)}
                onToggle={toggleTask} onDelete={handleDelete} onClone={cloneProject}
                onSetServer={setSrv} onAddTask={addTask} onUpdate={updateProject}
                agents={allAgents}
                commits={commitMap[sel.id]}
              />
            </div>
          </>
        )}
      </div>

      {showAdd && <AddModal onAdd={addProject} onClose={() => setShowAdd(false)} />}
      {fileAnalysis && (
        <FileAnalysisModal analysis={fileAnalysis.analysis} filename={fileAnalysis.filename}
          rawContent={fileAnalysis.rawContent} onConfirm={addProject} onClose={() => setFileAnalysis(null)} />
      )}
      <Toast toasts={toasts} onUndo={handleUndo} />
      <AIChat messages={aiMessages} loading={aiLoading} onSend={aiSend} onClear={aiClear} onOpenChange={setAiChatOpen} />
      {agentChatId && (() => { const ag = agentState.find(a => a.id === agentChatId); return ag ? <AgentChat agent={ag} projects={projects} onClose={() => setAgentChatId(null)} /> : null; })()}
      {showMyPage && <MyPage onClose={() => { setShowMyPage(false); window.dispatchEvent(new Event("phq-avatar-updated")); }} />}
      {showHire && <HireModal onHire={agent => { addAgent(agent); toast(`${agent.emoji} ${agent.name} 채용 완료!`, "success", "🤖"); setShowHire(false); }} onClose={() => setShowHire(false)} />}
      {showStats && <StatsView projects={projects} agentState={agentState} serverStats={serverStats} onClose={() => setShowStats(false)} onSelect={id => { setSelIdState(id); setViewMode("god"); setShowStats(false); }} />}
      {showAlerts && <AlertSettingsModal onClose={() => setShowAlerts(false)} />}

      {/* Mobile bottom tab bar */}
      <div className="phq-mobile-tabs" style={{
        position: "fixed", bottom: 0, left: 0, right: 0, height: 52,
        background: "#0a0a12", borderTop: "1px solid #1a1a24",
        alignItems: "center", justifyContent: "space-around", zIndex: 700,
      }}>
        {([
          ["god",      "🏢", "오피스"],
          ["kanban",   "📋", "칸반"],
          ["feed",     "💬", "피드"],
          ["portfolio","🗂️", "포폴"],
        ] as [string, string, string][]).map(([v, icon, label]) => (
          <button key={v} onClick={() => setViewMode(v)} style={{
            all: "unset", cursor: "pointer", display: "flex", flexDirection: "column",
            alignItems: "center", gap: 2, padding: "6px 12px",
            opacity: viewMode === v ? 1 : 0.4,
          }}>
            <span style={{ fontSize: 18 }}>{icon}</span>
            <span style={{ fontFamily: PF, fontSize: 4, color: viewMode === v ? "#facc15" : "#666" }}>{label}</span>
          </button>
        ))}
      </div>
    </div>
  );
}
