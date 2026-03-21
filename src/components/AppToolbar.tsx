import { PF, BF } from "../data/constants";

export type SortKey = "lastActivity" | "priority" | "progress" | "name" | "targetDate" | "health";

interface Props {
  viewMode: string;
  filter: string;
  search: string;
  sort: SortKey;
  showSidebar: boolean;
  onViewMode: (v: string) => void;
  onFilter: (f: string) => void;
  onSearch: (q: string) => void;
  onSort: (s: SortKey) => void;
  onToggleSidebar: () => void;
  onAdd: () => void;
  onHire: () => void;
  onStats: () => void;
}

const VIEW_MODES: [string, string][] = [
  ["god", "🏢 GOD"],
  ["kanban", "📌 KANBAN"],
  ["portfolio", "📋 FOLIO"],
  ["feed", "💬 FEED"],
];

const FILTERS = [
  { k: "all",      l: "ALL" },
  { k: "active",   l: "ACTIVE" },
  { k: "pivot",    l: "PIVOT" },
  { k: "paused",   l: "PAUSED" },
  { k: "complete", l: "DONE" },
];

const SORT_OPTIONS: [SortKey, string][] = [
  ["lastActivity", "최근활동"],
  ["priority",     "우선순위"],
  ["progress",     "진행률"],
  ["name",         "이름"],
  ["targetDate",   "마감일"],
  ["health",       "헬스"],
];

export default function AppToolbar({
  viewMode, filter, search, sort, showSidebar,
  onViewMode, onFilter, onSearch, onSort, onToggleSidebar, onAdd, onHire, onStats,
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

      {/* 정렬 (GOD 뷰에서만) */}
      {viewMode === "god" && (
        <select
          value={sort}
          onChange={e => onSort(e.target.value as SortKey)}
          aria-label="프로젝트 정렬"
          style={{ fontFamily: PF, fontSize: 4, color: "#888", background: "#111118", border: "1px solid #1e1e28", padding: "3px 6px", outline: "none", cursor: "pointer" }}
        >
          {SORT_OPTIONS.map(([k, l]) => (
            <option key={k} value={k}>{l}순</option>
          ))}
        </select>
      )}

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

      {/* 통계 버튼 */}
      <button
        onClick={onStats}
        aria-label="회사 통계"
        style={{ all: "unset", cursor: "pointer", fontFamily: PF, fontSize: 4, color: "#f472b6", background: "#0e080e", border: "1px solid #f472b633", padding: "4px 10px" }}
      >
        📊 STATS
      </button>

      {/* 채용 버튼 */}
      <button
        onClick={onHire}
        aria-label="에이전트 채용"
        style={{ all: "unset", cursor: "pointer", fontFamily: PF, fontSize: 4, color: "#4cc9f0", background: "#0a0e14", border: "1px solid #4cc9f044", padding: "4px 10px" }}
      >
        🤖 HIRE
      </button>

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
