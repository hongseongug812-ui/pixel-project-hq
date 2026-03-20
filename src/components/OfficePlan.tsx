import OfficeRoom from "./OfficeRoom";
import { ROOMS } from "../data/constants";
import type { Room, Project, AgentState } from "../types";

// 3층 구조 레이아웃
const FLOOR_ROWS: string[][] = [
  ["ceo", "meeting", "server"],   // 1층: 경영진
  ["office", "lounge"],           // 2층: 메인 사무실
  ["lab", "storage"],             // 3층: R&D
];

const VC_W = 26;  // 수직 복도 폭
const HC_H = 36;  // 수평 복도 높이
const BG   = "#0a0a10";
const HALL = "#0d0d16";

function VerticalCorridor() {
  return (
    <div style={{
      width: VC_W, background: HALL, flexShrink: 0,
      display: "flex", flexDirection: "column", justifyContent: "space-evenly", alignItems: "center",
      borderLeft: "1px solid #12121e", borderRight: "1px solid #12121e",
    }}>
      <div style={{ width: 1, height: "80%", background: "#161622", borderRadius: 2 }} />
    </div>
  );
}

function HorizontalCorridor({ w }: { w: number }) {
  return (
    <div style={{ width: w, height: HC_H, background: HALL, display: "flex", alignItems: "center", borderTop: "1px solid #111118", borderBottom: "1px solid #111118", overflow: "hidden" }}>
      {/* 복도 타일 패턴 */}
      {Array.from({ length: Math.ceil(w / 20) }).map((_, i) => (
        <div key={i} style={{ width: 20, height: HC_H, flexShrink: 0, background: i % 2 === 0 ? "#0e0e18" : "#0c0c14", borderRight: "1px solid #111118" }} />
      ))}
      {/* 복도 중앙선 */}
      <div style={{ position: "absolute", width: w, height: 1, background: "#161624", top: "50%" }} />
    </div>
  );
}

function FloorLabel({ label }: { label: string }) {
  return (
    <div style={{
      width: VC_W, background: "#0a0a10", display: "flex", alignItems: "center", justifyContent: "center",
      borderRight: "1px solid #111118", flexShrink: 0,
    }}>
      <span style={{
        fontFamily: '"Press Start 2P",monospace', fontSize: 4, color: "#1e1e28",
        writingMode: "vertical-rl", textOrientation: "mixed", letterSpacing: 2,
      }}>{label}</span>
    </div>
  );
}

interface Props {
  grouped: Record<string, Project[]>;
  agentState: AgentState[];
  selectedId: number | string | null;
  isMeetingActive: boolean;
  onSelect: (id: number | string) => void;
  onAgentClick: (id: string) => void;
}

export default function OfficePlan({ grouped, agentState, selectedId, isMeetingActive, onSelect, onAgentClick }: Props) {
  const roomMap = new Map<string, Room>(ROOMS.map(r => [r.key, r]));

  const rowWidths = FLOOR_ROWS.map(keys =>
    keys.reduce((sum, k, i) => sum + (roomMap.get(k)?.w ?? 0) + (i < keys.length - 1 ? VC_W : 0), 0)
  );
  const totalW = Math.max(...rowWidths) + VC_W; // +VC_W for floor label

  const floorLabels = ["B1F 경영진", "2F 사무실", "1F R&D"];

  return (
    <div style={{ display: "inline-flex", flexDirection: "column", background: BG, border: "1px solid #131320", borderRadius: 2 }}>
      {FLOOR_ROWS.map((keys, rowIdx) => {
        const rowRooms = keys.map(k => roomMap.get(k)).filter((r): r is Room => !!r);
        const rowW = rowWidths[rowIdx];

        return (
          <div key={rowIdx}>
            {/* 방 행 */}
            <div style={{ display: "flex", alignItems: "stretch" }}>
              {/* 층 레이블 */}
              <FloorLabel label={floorLabels[rowIdx]} />

              {rowRooms.map((rm, i) => (
                <div key={rm.key} style={{ display: "flex", alignItems: "stretch" }}>
                  <OfficeRoom
                    roomCfg={rm}
                    projects={grouped[rm.key] || []}
                    agents={agentState.filter(a => a.room === rm.key)}
                    selectedId={selectedId}
                    isMeetingActive={rm.key === "meeting" ? isMeetingActive : false}
                    onSelect={onSelect}
                    onAgentClick={onAgentClick}
                  />
                  {i < rowRooms.length - 1 && <VerticalCorridor />}
                </div>
              ))}

              {/* 짧은 행은 빈 공간으로 채우기 */}
              {rowW < rowWidths[0] && (
                <div style={{ width: rowWidths[0] - rowW, background: BG, borderLeft: "1px solid #0d0d18" }} />
              )}
            </div>

            {/* 수평 복도 (마지막 행 제외) */}
            {rowIdx < FLOOR_ROWS.length - 1 && <HorizontalCorridor w={totalW} />}
          </div>
        );
      })}
    </div>
  );
}
