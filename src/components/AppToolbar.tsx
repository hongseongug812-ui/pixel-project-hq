import { PF, BF } from "../data/constants";

interface Props {
  viewMode: string;
  filter: string;
  search: string;
  showSidebar: boolean;
  onViewMode: (v: string) => void;
  onFilter: (f: string) => void;
  onSearch: (q: string) => void;
  onToggleSidebar: () => void;
  onAdd: () => void;
}

const VIEW_MODES: [string, string][] = [
  ["god", "🏢 GOD"],
  ["kanban", "📌 KANBAN"],
  ["portfolio", "📋 FOLIO"],
];

const FILTERS = [
  { k: "all",      l: "ALL" },
  { k: "active",   l: "ACTIVE" },
  { k: "pivot",    l: "PIVOT" },
  { k: "paused",   l: "PAUSED" },
  { k: "complete", l: "DONE" },
];

export default function AppToolbar({
  viewMode, filter, search, showSidebar,
  onViewMode, onFilter, onSearch, onToggleSidebar, onAdd,
}: Props) {
  return (
    <nav
      aria-label="뷰 모드 및 필터"
      style={{
        padding: "5px 14px", borderBottom: "1px solid #141420",
        display: "flex", gap: 3, alignItems: "center", flexWrap: "wrap",
        background: "#0c0c14",
      }}
    >
      {/* 사이드바 토글 (GOD 뷰에서만) */}
      {viewMode === "god" && (
        <button
          onClick={onToggleSidebar}
          aria-label={showSidebar ? "사이드바 숨기기" : "사이드바 열기"}
          aria-expanded={showSidebar}
          style={{ all: "unset", cursor: "pointer", fontFamily: PF, fontSize: 8, padding: "3px 6px", color: showSidebar ? "#facc15" : "#444", background: "#111118", border: "1px solid #1e1e28", marginRight: 4 }}
        >
          ☰
        </button>
      )}

      {/* 뷰 모드 전환 */}
      <div role="group" aria-label="뷰 선택" style={{ display: "flex", marginRight: 6, border: "1px solid #1e1e28" }}>
        {VIEW_MODES.map(([v, l]) => (
          <button
            key={v}
            onClick={() => onViewMode(v)}
            aria-pressed={viewMode === v}
            aria-label={`${l} 뷰`}
            style={{ all: "unset", cursor: "pointer", fontFamily: PF, fontSize: 4, padding: "4px 9px", color: viewMode === v ? "#000" : "#444", background: viewMode === v ? "#facc15" : "#111118" }}
          >
            {l}
          </button>
        ))}
      </div>

      {/* 상태 필터 (GOD 뷰에서만) */}
      {viewMode === "god" && (
        <div role="group" aria-label="상태 필터" className="phq-filters" style={{ display: "flex", gap: 3, flexWrap: "wrap" }}>
          {FILTERS.map(f => (
            <button
              key={f.k}
              onClick={() => onFilter(f.k)}
              aria-pressed={filter === f.k}
              aria-label={`${f.l} 필터`}
              style={{ all: "unset", cursor: "pointer", fontFamily: PF, fontSize: 5, padding: "3px 7px", color: filter === f.k ? "#000" : "#444", background: filter === f.k ? "#facc15" : "#111118", border: `1px solid ${filter === f.k ? "#b89a0d" : "#1e1e28"}` }}
            >
              {f.l}
            </button>
          ))}
        </div>
      )}

      <div style={{ flex: 1 }} />

      {/* 검색 (GOD 뷰에서만) */}
      {viewMode === "god" && (
        <input
          className="phq-search"
          value={search}
          onChange={e => onSearch(e.target.value)}
          placeholder="🔍 검색..."
          aria-label="프로젝트 검색"
          style={{ fontFamily: BF, fontSize: 11, color: "#aaa", background: "#111118", border: "1px solid #1e1e28", padding: "3px 8px", outline: "none", width: 160 }}
        />
      )}

      {/* 추가 버튼 */}
      <button
        onClick={onAdd}
        aria-label="새 프로젝트 추가"
        style={{ all: "unset", cursor: "pointer", fontFamily: BF, fontSize: 13, fontWeight: "bold", color: "#000", background: "#4ade80", padding: "3px 11px", boxShadow: "0 0 8px #4ade8044" }}
      >
        + 추가
      </button>
      <span style={{ fontFamily: BF, fontSize: 11, color: "#1e1e2e" }}>Ctrl+N · ESC</span>
    </nav>
  );
}
