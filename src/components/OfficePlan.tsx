import OfficeRoom from "./OfficeRoom";
import { ROOMS } from "../data/constants";
import type { Room, Project, AgentState } from "../types";

const FLOOR_ROWS: string[][] = [
  ["ceo", "meeting", "server"],
  ["office", "lounge"],
  ["lab", "storage"],
];

const VC_W = 40;   // 수직 복도 폭
const HC_H = 52;   // 수평 복도 높이

// 수직 복도 — 방과 방 사이 통로
function VerticalCorridor({ h }: { h: number }) {
  return (
    <div style={{
      width: VC_W,
      height: h,
      flexShrink: 0,
      background: "#18181f",
      borderLeft:  "2px solid #222230",
      borderRight: "2px solid #222230",
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      justifyContent: "space-between",
      paddingTop: 8,
      paddingBottom: 8,
      boxSizing: "border-box",
    }}>
      {/* 복도 중앙 타일 라인 */}
      {Array.from({ length: Math.floor(h / 18) }).map((_, i) => (
        <div key={i} style={{ width: 6, height: 6, borderRadius: "50%", background: "#252535", flexShrink: 0 }} />
      ))}
    </div>
  );
}

// 수평 복도 — 층과 층 사이 통로
function HorizontalCorridor({ w }: { w: number }) {
  const tileW = 24;
  const count = Math.ceil(w / tileW);
  return (
    <div style={{
      width: w,
      height: HC_H,
      background: "#141420",
      borderTop:    "2px solid #1e1e2e",
      borderBottom: "2px solid #1e1e2e",
      display: "flex",
      alignItems: "center",
      overflow: "hidden",
      position: "relative",
    }}>
      {/* 바닥 타일 */}
      {Array.from({ length: count }).map((_, i) => (
        <div
          key={i}
          style={{
            width: tileW,
            height: HC_H,
            flexShrink: 0,
            background: i % 2 === 0 ? "#161624" : "#121220",
            borderRight: "1px solid #1a1a28",
          }}
        />
      ))}
      {/* 중앙 안내선 */}
      <div style={{
        position: "absolute",
        top: "50%",
        left: 0,
        width: w,
        height: 2,
        background: "#1e1e2e",
        transform: "translateY(-50%)",
      }} />
      {/* 방향 화살표 점선 */}
      {Array.from({ length: Math.floor(w / 60) }).map((_, i) => (
        <div
          key={`arrow-${i}`}
          style={{
            position: "absolute",
            left: i * 60 + 24,
            top: "50%",
            transform: "translateY(-50%)",
            fontFamily: '"Press Start 2P",monospace',
            fontSize: 6,
            color: "#252535",
            letterSpacing: 2,
          }}
        >
          ›
        </div>
      ))}
    </div>
  );
}

// 층 번호 레이블 (세로 복도 왼쪽)
function FloorLabel({ label, h }: { label: string; h: number }) {
  return (
    <div style={{
      width: 28,
      height: h,
      background: "#0f0f18",
      borderRight: "2px solid #1a1a28",
      flexShrink: 0,
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
    }}>
      <span style={{
        fontFamily: '"Press Start 2P",monospace',
        fontSize: 4,
        color: "#2a2a3e",
        writingMode: "vertical-rl",
        textOrientation: "mixed",
        letterSpacing: 3,
        userSelect: "none",
      }}>
        {label}
      </span>
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

export default function OfficePlan({
  grouped, agentState, selectedId, isMeetingActive, onSelect, onAgentClick,
}: Props) {
  const roomMap = new Map<string, Room>(ROOMS.map(r => [r.key, r]));

  // 각 행의 방들만 합산한 너비 (수직복도 + 층레이블 제외)
  const rowRoomWidths = FLOOR_ROWS.map(keys =>
    keys.reduce((sum, k, i) => sum + (roomMap.get(k)?.w ?? 0) + (i < keys.length - 1 ? VC_W : 0), 0)
  );
  const maxRoomW  = Math.max(...rowRoomWidths);
  const totalW    = 28 + maxRoomW; // 층레이블 폭 포함

  const floorLabels = ["3F", "2F", "1F"];

  return (
    <div style={{
      display: "inline-flex",
      flexDirection: "column",
      background: "#0a0a10",
      border: "2px solid #1a1a28",
      borderRadius: 4,
    }}>
      {FLOOR_ROWS.map((keys, rowIdx) => {
        const rowRooms = keys.map(k => roomMap.get(k)).filter((r): r is Room => !!r);
        const rowH = Math.max(...rowRooms.map(r => r.h)) + 24; // +24 room label bar
        const thisRowW = rowRoomWidths[rowIdx];

        return (
          <div key={rowIdx}>
            {/* 방 행 */}
            <div style={{ display: "flex", alignItems: "stretch" }}>
              {/* 층 번호 */}
              <FloorLabel label={floorLabels[rowIdx]} h={rowH} />

              {/* 방들 + 수직 복도 */}
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
                  {i < rowRooms.length - 1 && <VerticalCorridor h={rowH} />}
                </div>
              ))}

              {/* 짧은 행 패딩 */}
              {thisRowW < maxRoomW && (
                <div style={{ width: maxRoomW - thisRowW, background: "#0a0a10", borderLeft: "2px solid #1a1a28" }} />
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
