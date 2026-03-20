import { PF, BF } from "../data/constants";
import { isConfigured } from "../lib/supabase";
import type { User } from "@supabase/supabase-js";

interface Props {
  user: User | null;
  saving: boolean;
  projectCount: number;
  activeCount: number;
  neglectCount: number;
  liveCount: number;
  onMyPage: () => void;
  onSignOut: () => void;
}

export default function AppHeader({
  user, saving, projectCount, activeCount, neglectCount, liveCount, onMyPage, onSignOut,
}: Props) {
  return (
    <header
      role="banner"
      style={{
        padding: "8px 14px", borderBottom: "1px solid #1a1a28",
        display: "flex", alignItems: "center", justifyContent: "space-between",
        flexWrap: "wrap", gap: 6, background: "#0a0a10",
      }}
    >
      {/* Left: logo + status */}
      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
        <span style={{ fontFamily: PF, fontSize: 9, color: "#facc15", letterSpacing: 2, textShadow: "0 0 10px #facc1566" }}>
          <span style={{ color: "#ef4444" }}>⬤</span> PIXEL HQ
        </span>
        <div style={{ display: "flex", alignItems: "center", gap: 3 }}>
          <div style={{ width: 5, height: 5, borderRadius: "50%", background: isConfigured ? "#4ade80" : "#f59e0b", boxShadow: `0 0 5px ${isConfigured ? "#4ade80" : "#f59e0b"}` }} />
          <span style={{ fontFamily: PF, fontSize: 4, color: isConfigured ? "#4ade8088" : "#f59e0b88" }}>
            {isConfigured ? "CLOUD" : "LOCAL"}
          </span>
        </div>
        {saving && <span style={{ fontFamily: BF, fontSize: 11, color: "#60a5fa" }}>저장 중...</span>}
        {liveCount > 0 && (
          <div style={{ display: "flex", alignItems: "center", gap: 3 }}>
            <div style={{ width: 5, height: 5, borderRadius: "50%", background: "#4ade80", boxShadow: "0 0 5px #4ade80" }} />
            <span style={{ fontFamily: PF, fontSize: 4, color: "#4ade80" }}>{liveCount} LIVE</span>
          </div>
        )}
      </div>

      {/* Right: stats + actions */}
      <div style={{ display: "flex", gap: 4, alignItems: "center", flexWrap: "wrap" }}>
        {(
          [
            ["PRJ",    projectCount, "#60a5fa"],
            ["ACTIVE", activeCount,  "#4ade80"],
            ["WARN",   neglectCount, neglectCount ? "#ef4444" : "#2a2a38"],
            ["SRV",    liveCount,    liveCount    ? "#a78bfa" : "#2a2a38"],
          ] as [string, number, string][]
        ).map(([l, v, c]) => (
          <div key={l} style={{ background: "#0e0e16", padding: "2px 7px", border: `1px solid ${c}22`, display: "flex", alignItems: "center", gap: 4 }}>
            <span style={{ fontFamily: PF, fontSize: 4, color: "#333" }}>{l}</span>
            <span style={{ fontFamily: PF, fontSize: 8, color: c }}>{v}</span>
          </div>
        ))}
        <button
          onClick={onMyPage}
          aria-label="설정 열기"
          style={{ all: "unset", cursor: "pointer", fontFamily: PF, fontSize: 4, color: "#a78bfa", background: "#111118", border: "1px solid #2a1a4a", padding: "2px 6px" }}
        >
          ⚙ MY
        </button>
        {user && (
          <div style={{ display: "flex", alignItems: "center", gap: 5, marginLeft: 4 }}>
            <span style={{ fontFamily: BF, fontSize: 11, color: "#444" }}>{user.email?.split("@")[0]}</span>
            <button
              onClick={onSignOut}
              aria-label="로그아웃"
              style={{ all: "unset", cursor: "pointer", fontFamily: PF, fontSize: 4, color: "#444", background: "#111118", border: "1px solid #1e1e28", padding: "2px 5px" }}
            >
              OUT
            </button>
          </div>
        )}
      </div>
    </header>
  );
}
