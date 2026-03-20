import { useState, useMemo } from "react";
import { PF, BF, ROOMS, STATUS_MAP } from "../data/constants";
import type { Project } from "../types";

interface InitialsProps { name: string; color: string; size?: number; }
function Initials({ name, color, size = 100 }: InitialsProps) {
  const letters = name.split(" ").slice(0, 2).map(w => w[0]).join("").toUpperCase().slice(0, 2);
  return (
    <div style={{ width: "100%", height: size, display: "flex", alignItems: "center", justifyContent: "center", background: `linear-gradient(135deg, ${color}22 0%, ${color}08 100%)`, borderBottom: `1px solid ${color}22`, position: "relative", overflow: "hidden" }}>
      <svg style={{ position: "absolute", inset: 0, opacity: 0.08 }} width="100%" height="100%">
        <defs><pattern id={`g-${name}`} width="20" height="20" patternUnits="userSpaceOnUse">
          <path d="M 20 0 L 0 0 0 20" fill="none" stroke={color} strokeWidth="0.5" />
        </pattern></defs>
        <rect width="100%" height="100%" fill={`url(#g-${name})`} />
      </svg>
      <span style={{ fontFamily: PF, fontSize: 22, color, opacity: 0.6, position: "relative", zIndex: 1, textShadow: `0 0 20px ${color}` }}>{letters}</span>
    </div>
  );
}

interface PortfolioCardProps { project: Project; featured: boolean; onSelect: (id: number | string) => void; }
function PortfolioCard({ project: p, featured, onSelect }: PortfolioCardProps) {
  const [hover, setHover] = useState(false);
  const rm = ROOMS.find(r => r.key === p.room) || ROOMS[0];
  const st = STATUS_MAP[p.status];
  const done  = p.tasks?.filter(t => t.done).length || 0;
  const total = p.tasks?.length || 0;

  const duration = (() => {
    if (!p.startDate) return null;
    const start = new Date(p.startDate);
    const end   = p.endDate ? new Date(p.endDate) : new Date();
    const months = Math.max(0, Math.round((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24 * 30)));
    if (months === 0) return "< 1mo";
    return months < 12 ? `${months}mo` : `${Math.round(months / 12)}yr`;
  })();

  const openUrl = (url: string | null) => {
    if (!url) return;
    window.open(url.startsWith("http") ? url : `https://${url}`, "_blank", "noopener,noreferrer");
  };

  return (
    <div
      onClick={() => onSelect(p.id)}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      style={{
        background: "#0e0e14",
        border: `1px solid ${hover ? rm.color + "55" : p.featured ? "#facc1533" : "#1a1a28"}`,
        borderRadius: 4, overflow: "hidden", cursor: "pointer",
        transition: "border-color .2s, transform .15s, box-shadow .2s",
        transform: hover ? "translateY(-2px)" : "none",
        boxShadow: hover ? `0 8px 24px ${rm.color}18` : p.featured ? `0 0 12px #facc1512` : "none",
        gridColumn: featured ? "span 2" : "span 1",
        display: "flex", flexDirection: featured ? "row" : "column",
      }}
    >
      <div style={{ flexShrink: 0, width: featured ? 220 : "100%", position: "relative" }}>
        {p.thumbnail ? (
          <img src={p.thumbnail} alt={p.name} style={{ width: "100%", height: featured ? "100%" : 100, objectFit: "cover", display: "block" }}
            onError={e => (e.target as HTMLImageElement).style.display = "none"} />
        ) : null}
        <Initials name={p.name} color={rm.color} size={p.thumbnail ? 0 : 100} />
        {p.featured && (
          <div style={{ position: "absolute", top: 6, left: 6, fontFamily: PF, fontSize: 5, color: "#facc15", background: "#0a0a0a99", padding: "2px 5px", border: "1px solid #facc1544" }}>★ FEATURED</div>
        )}
        <div style={{ position: "absolute", top: 6, right: 6, fontFamily: PF, fontSize: 4, color: st.color, background: "#0a0a0a99", padding: "1px 4px", border: `1px solid ${st.color}44` }}>{st.label}</div>
      </div>

      <div style={{ padding: "10px 12px", display: "flex", flexDirection: "column", gap: 6, flex: 1, minWidth: 0 }}>
        <div>
          <div style={{ fontFamily: PF, fontSize: featured ? 9 : 7, color: "#ddd", lineHeight: 1.6, marginBottom: 3 }}>{p.name}</div>
          {p.description && (
            <div style={{ fontFamily: BF, fontSize: 11, color: "#777", lineHeight: 1.5, overflow: "hidden", display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical" } as React.CSSProperties}>{p.description}</div>
          )}
        </div>

        {p.stack?.length > 0 && (
          <div style={{ display: "flex", flexWrap: "wrap", gap: 3 }}>
            {p.stack.map(s => (
              <span key={s} style={{ fontFamily: PF, fontSize: 4, color: rm.color, background: rm.color + "18", padding: "1px 5px", border: `1px solid ${rm.color}33` }}>{s}</span>
            ))}
          </div>
        )}

        <div>
          <div style={{ display: "flex", justifyContent: "space-between", fontFamily: BF, fontSize: 10, color: "#444", marginBottom: 2 }}>
            <span>TASKS {done}/{total}</span>
            <span style={{ color: rm.color }}>{p.progress}%</span>
          </div>
          <div style={{ height: 3, background: "#1a1a22" }}>
            <div style={{ width: `${p.progress}%`, height: "100%", background: rm.color, boxShadow: `0 0 6px ${rm.color}88` }} />
          </div>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 6, marginTop: "auto" }}>
          {p.startDate && (
            <span style={{ fontFamily: BF, fontSize: 10, color: "#444" }}>
              {p.startDate.slice(0, 7)}{p.endDate ? ` → ${p.endDate.slice(0, 7)}` : " → 진행중"}
            </span>
          )}
          {duration && !p.startDate && <span style={{ fontFamily: BF, fontSize: 10, color: "#444" }}>{duration}</span>}
          <div style={{ flex: 1 }} />
          {p.serverUrl && (
            <button onClick={e => { e.stopPropagation(); openUrl(p.serverUrl); }} style={{ all: "unset", cursor: "pointer", fontFamily: PF, fontSize: 4, color: "#000", background: "#4ade80", padding: "2px 6px" }}>LIVE ↗</button>
          )}
          {p.githubUrl && (
            <button onClick={e => { e.stopPropagation(); openUrl(p.githubUrl); }} style={{ all: "unset", cursor: "pointer", fontFamily: PF, fontSize: 4, color: "#a78bfa", background: "#a78bfa18", padding: "2px 6px", border: "1px solid #a78bfa33" }}>GH ↗</button>
          )}
        </div>
      </div>
    </div>
  );
}

interface PortfolioViewProps {
  projects: Project[];
  onSelect: (id: number | string) => void;
  onExportJSON: () => void;
  onExportHTML: () => void;
}

export default function PortfolioView({ projects, onSelect, onExportJSON, onExportHTML }: PortfolioViewProps) {
  const [filter, setFilter] = useState("all");
  const [search, setSearch] = useState("");

  const filtered = useMemo(() => projects.filter(p => {
    if (filter === "featured") return p.featured;
    if (filter !== "all" && p.status !== filter) return false;
    if (search) {
      const q = search.toLowerCase();
      return p.name.toLowerCase().includes(q) || (p.description || "").toLowerCase().includes(q) || (p.stack || []).some(s => s.toLowerCase().includes(q));
    }
    return true;
  }), [projects, filter, search]);

  const featuredProjects = filtered.filter(p => p.featured);
  const rest             = filtered.filter(p => !p.featured);
  const stats = {
    total:  projects.length,
    live:   projects.filter(p => p.serverUrl).length,
    done:   projects.filter(p => p.status === "complete").length,
    stacks: [...new Set(projects.flatMap(p => p.stack || []))].length,
  };

  return (
    <div style={{ flex: 1, padding: "16px 20px", overflow: "auto", background: "#0d0d12" }}>
      <div style={{ marginBottom: 20 }}>
        <div style={{ fontFamily: PF, fontSize: 12, color: "#facc15", letterSpacing: 3, marginBottom: 8, textShadow: "0 0 20px #facc1544" }}>PORTFOLIO</div>
        <div style={{ display: "flex", gap: 16, flexWrap: "wrap", marginBottom: 14, alignItems: "flex-end" }}>
          {([
            ["PROJECTS", stats.total, "#60a5fa"],
            ["LIVE",     stats.live,  "#4ade80"],
            ["DONE",     stats.done,  "#a78bfa"],
            ["STACKS",   stats.stacks,"#f4a261"],
          ] as [string, number, string][]).map(([l, v, c]) => (
            <div key={l} style={{ display: "flex", flexDirection: "column", gap: 2 }}>
              <span style={{ fontFamily: PF, fontSize: 4, color: "#444" }}>{l}</span>
              <span style={{ fontFamily: PF, fontSize: 14, color: c, textShadow: `0 0 10px ${c}66` }}>{v}</span>
            </div>
          ))}
          <div style={{ marginLeft: "auto", display: "flex", gap: 6, alignItems: "center" }}>
            <button onClick={onExportJSON} style={{ all: "unset", cursor: "pointer", fontFamily: PF, fontSize: 5, color: "#60a5fa", background: "#0a1020", border: "1px solid #60a5fa33", padding: "4px 9px" }}>↓ JSON</button>
            <button onClick={onExportHTML} style={{ all: "unset", cursor: "pointer", fontFamily: BF, fontSize: 12, fontWeight: "bold", color: "#000", background: "#facc15", padding: "4px 10px" }}>↓ HTML 포폴</button>
          </div>
        </div>

        <div style={{ display: "flex", gap: 6, alignItems: "center", flexWrap: "wrap" }}>
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="검색..."
            style={{ fontFamily: BF, fontSize: 12, color: "#aaa", background: "#0e0e16", border: "1px solid #1e1e28", padding: "4px 9px", outline: "none", width: 160 }} />
          {[
            { k: "all",      l: "ALL" },
            { k: "featured", l: "★ FEATURED" },
            { k: "active",   l: "ACTIVE" },
            { k: "complete", l: "DONE" },
            { k: "paused",   l: "PAUSED" },
          ].map(f => (
            <button key={f.k} onClick={() => setFilter(f.k)} style={{
              all: "unset", cursor: "pointer", fontFamily: PF, fontSize: 4, padding: "3px 7px",
              color: filter === f.k ? "#000" : "#555",
              background: filter === f.k ? "#facc15" : "#111118",
              border: `1px solid ${filter === f.k ? "#b89a0d" : "#1e1e28"}`,
            }}>{f.l}</button>
          ))}
        </div>
      </div>

      {filtered.length === 0 ? (
        <div style={{ textAlign: "center", padding: "60px 0", fontFamily: BF, fontSize: 18, color: "#333" }}>프로젝트 없음</div>
      ) : (
        <>
          {featuredProjects.length > 0 && (
            <div style={{ marginBottom: 20 }}>
              <div style={{ fontFamily: PF, fontSize: 5, color: "#facc1566", marginBottom: 10, letterSpacing: 2 }}>★ FEATURED</div>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 10 }}>
                {featuredProjects.map(p => <PortfolioCard key={p.id} project={p} featured={true} onSelect={onSelect} />)}
              </div>
            </div>
          )}
          {rest.length > 0 && (
            <div>
              {featuredProjects.length > 0 && <div style={{ fontFamily: PF, fontSize: 5, color: "#444", marginBottom: 10, letterSpacing: 2 }}>ALL PROJECTS</div>}
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(240px, 1fr))", gap: 10 }}>
                {rest.map(p => <PortfolioCard key={p.id} project={p} featured={false} onSelect={onSelect} />)}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
