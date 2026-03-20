import { useMemo, useState } from "react";
import { STATUS_MAP, ROOM_MAX_DESKS, DESK_SLOTS } from "../data/constants";
import { neglect } from "../utils/helpers";
import { Monitor, Desk, Chair, Plant, Bookshelf, ServerRack, Whiteboard, WaterCooler, Sofa, MeetingTable, Clock, Printer, Coffee, Character, ServerNode } from "./Sprites";
import type { Room, Project, AgentState } from "../types";

interface RoomDecorationsProps { roomKey: string; w: number; h: number; }
function RoomDecorations({ roomKey, w, h }: RoomDecorationsProps) {
  switch (roomKey) {
    case "lab": return <><Bookshelf x={w-28} y={16}/><Whiteboard x={14} y={14}/><Plant x={w-18} y={h-22}/><Coffee x={60} y={47}/></>;
    case "office": return <><Whiteboard x={16} y={14} w={40}/><Plant x={w-20} y={16} big/><Plant x={10} y={h-24}/><Printer x={w-26} y={h-22}/><Clock x={w/2+20} y={3}/><WaterCooler x={w-24} y={80}/><Coffee x={110} y={47}/><Coffee x={190} y={117}/></>;
    case "server": return <><ServerRack x={10} y={16}/><ServerRack x={32} y={16}/><ServerRack x={10} y={60}/><ServerRack x={32} y={60}/><ServerRack x={w-30} y={16}/></>;
    case "ceo": return <><Bookshelf x={w-28} y={16}/><Plant x={10} y={h-24} big/><Plant x={w-18} y={h-24}/><Coffee x={80} y={58}/><Clock x={w/2} y={2}/></>;
    case "lounge": return <><Sofa x={20} y={30}/><Sofa x={20} y={75} color="#4a6a8a"/><Plant x={10} y={16} big/><Plant x={w-20} y={16}/><WaterCooler x={w-24} y={50}/><Coffee x={70} y={42}/></>;
    case "meeting": return <><MeetingTable x={w/2-30} y={40}/><Whiteboard x={16} y={14} w={50}/><Plant x={w-18} y={h-22}/><Clock x={w/2+30} y={2}/></>;
    case "storage": return <><Bookshelf x={10} y={16}/><Bookshelf x={34} y={16}/><Bookshelf x={w-28} y={16}/></>;
    default: return null;
  }
}

interface OfficeRoomProps {
  roomCfg: Room;
  projects: Project[];
  agents: AgentState[];
  selectedId: number | string | null;
  isMeetingActive?: boolean;
  onSelect: (id: number | string) => void;
}

function AgentTooltip({ agent, x, y, roomW }: { agent: AgentState; x: number; y: number; roomW: number }) {
  const PF = `"Press Start 2P",monospace`;
  const task = agent.currentTask.length > 20 ? agent.currentTask.slice(0, 20) + "…" : agent.currentTask;
  const nameW = Math.max(agent.name.length, task.length) * 5.5 + 20;
  const boxW = Math.max(nameW, 80);
  const boxH = 38;
  // 화면 밖으로 나가지 않도록 위치 조정
  const tx = Math.min(Math.max(x - boxW / 2 + 7, 4), roomW - boxW - 4);
  const ty = y - boxH - 6;

  return (
    <g style={{ pointerEvents: "none" }}>
      {/* 말풍선 꼬리 */}
      <polygon
        points={`${x + 3},${ty + boxH} ${x + 7},${ty + boxH} ${x + 7},${ty + boxH + 5}`}
        fill="#1a1a2e"
      />
      {/* 배경 */}
      <rect x={tx} y={ty} width={boxW} height={boxH} rx="2" fill="#1a1a2e" opacity="0.95" />
      <rect x={tx} y={ty} width={boxW} height={boxH} rx="2" fill="none" stroke={agent.body} strokeWidth="1" opacity="0.7" />
      {/* 이름 + 이모지 */}
      <text x={tx + 7} y={ty + 12} fill={agent.body} fontSize="6" fontFamily={PF} fontWeight="bold">
        {agent.emoji} {agent.name}
      </text>
      {/* 역할 */}
      <text x={tx + 7} y={ty + 22} fill="#888" fontSize="5" fontFamily={PF}>
        {agent.role}
      </text>
      {/* 현재 작업 */}
      <text x={tx + 7} y={ty + 33} fill="#ccc" fontSize="5" fontFamily={PF}>
        {task}
      </text>
    </g>
  );
}

export default function OfficeRoom({ roomCfg, projects, agents, selectedId, isMeetingActive, onSelect }: OfficeRoomProps) {
  const rm = roomCfg;
  const [hoveredAgentId, setHoveredAgentId] = useState<string | null>(null);
  const hoveredAgent = agents.find(a => a.id === hoveredAgentId) ?? null;
  const T = 10;
  const cols = Math.floor(rm.w / T), rows = Math.floor(rm.h / T);
  const max = ROOM_MAX_DESKS[rm.key] || 6;
  const slots = DESK_SLOTS[rm.key] || [];
  const isServerRoom = rm.key === "server";

  const floorTiles = useMemo(() =>
    Array.from({ length: rows }, (_, r) =>
      Array.from({ length: cols }, (_, c) => (
        <rect key={`${r}-${c}`} x={c * T} y={r * T} width={T} height={T}
          fill={(r + c) % 2 === 0 ? rm.floorA : rm.floorB} />
      ))
    ),
  [rows, cols, rm.floorA, rm.floorB]);

  return (
    <div style={{ display: "inline-block", verticalAlign: "top", borderRadius: "4px 4px 0 0", overflow: "visible" }}>
      <svg width={rm.w} height={rm.h} viewBox={`0 0 ${rm.w} ${rm.h}`}
        style={{ display: "block", imageRendering: "pixelated", borderRadius: "4px 4px 0 0", overflow: "visible" }}>
        <defs>
          <filter id={`glow-${rm.key}`} x="-30%" y="-30%" width="160%" height="160%">
            <feGaussianBlur stdDeviation="2" result="blur" />
            <feMerge><feMergeNode in="blur"/><feMergeNode in="SourceGraphic"/></feMerge>
          </filter>
          <filter id={`glow-strong-${rm.key}`} x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur stdDeviation="3.5" result="blur" />
            <feMerge><feMergeNode in="blur"/><feMergeNode in="SourceGraphic"/></feMerge>
          </filter>
        </defs>

        {floorTiles}

        <rect x="0" y="0" width={rm.w} height="10" fill={rm.wallColor} />
        <rect x="0" y="10" width={rm.w} height="3" fill={rm.trim} />
        <rect x="0" y="0" width="6" height={rm.h} fill={rm.wallDark} />
        <rect x={rm.w - 6} y="0" width="6" height={rm.h} fill={rm.wallDark} />
        <rect x="0" y={rm.h - 3} width={rm.w} height="3" fill={rm.wallDark} opacity=".3" />

        <rect x={rm.w / 2 - 12} y="0" width="24" height="13" fill={rm.floorA} />
        <rect x={rm.w / 2 - 13} y="0" width="2" height="13" fill="#6a5020" />
        <rect x={rm.w / 2 + 11} y="0" width="2" height="13" fill="#6a5020" />
        <rect x={rm.w / 2 - 12} y="11" width="24" height="2" fill="#5a4018" />

        <RoomDecorations roomKey={rm.key} w={rm.w} h={rm.h} />

        {isMeetingActive && rm.key === "meeting" && (
          <g>
            <rect x={rm.w / 2 - 42} y={rm.h / 2 - 10} width={84} height={18} rx={2} fill="#1a0a14" opacity={0.92} />
            <rect x={rm.w / 2 - 42} y={rm.h / 2 - 10} width={84} height={18} rx={2} fill="none" stroke="#f472b6" strokeWidth={1} opacity={0.7} />
            <text x={rm.w / 2} y={rm.h / 2 + 4} fill="#f472b6" fontSize="6" fontFamily={`"Press Start 2P",monospace`} textAnchor="middle">📋 긴급 회의중</text>
          </g>
        )}

        {slots.slice(Math.min(projects.length, max), max).map((slot, i) => (
          <g key={`ghost-${i}`} opacity="0.55">
            <Chair x={slot.x + 10} y={slot.y + 20} />
            <Desk x={slot.x} y={slot.y} />
            <Monitor x={slot.x + 6} y={slot.y - 20} sc="#445566" on={false} />
          </g>
        ))}

        {projects.slice(0, max).map((proj, i) => {
          const slot = slots[i];
          if (!slot) return null;
          const st = STATUS_MAP[proj.status];
          const nl = neglect(proj.lastActivity, proj.status);
          const isSel = proj.id === selectedId;

          if (isServerRoom && proj.serverUrl) {
            return (
              <ServerNode
                key={proj.id}
                x={slot.x}
                y={slot.y}
                proj={proj}
                isSel={isSel}
                roomColor={rm.color}
                onSelect={onSelect}
              />
            );
          }

          return (
            <g key={proj.id} onClick={e => { e.stopPropagation(); onSelect(proj.id); }} style={{ cursor: "pointer" }}>
              {isSel && <rect x={slot.x - 6} y={slot.y - 24} width="48" height="50" fill={rm.color} opacity=".15" rx="3" />}
              {nl > 0 && (
                <rect x={slot.x} y={slot.y - 22} width="36" height="2.5" fill={nl === 2 ? "#ef4444" : "#f59e0b"} rx="1">
                  <animate attributeName="opacity" values={nl === 2 ? "1;0.3;1" : "0.7;0.4;0.7"} dur={nl === 2 ? "0.7s" : "2s"} repeatCount="indefinite" />
                </rect>
              )}
              <Chair x={slot.x + 10} y={slot.y + 20} />
              <Desk x={slot.x} y={slot.y} />
              <g filter={proj.serverUrl ? `url(#glow-strong-${rm.key})` : (proj.status === "active" || proj.status === "pivot") ? `url(#glow-${rm.key})` : undefined}>
                <Monitor
                  x={slot.x + 6} y={slot.y - 20}
                  sc={st.color}
                  on={proj.status !== "paused"}
                  progress={proj.progress}
                  serverUrl={proj.serverUrl}
                />
              </g>
              {proj.priority === "high" && (
                <circle cx={slot.x + 34} cy={slot.y - 16} r="2.5" fill="#ef4444">
                  <animate attributeName="opacity" values="1;0.3;1" dur="0.8s" repeatCount="indefinite" />
                </circle>
              )}
              {proj.serverUrl && (
                <circle cx={slot.x + 28} cy={slot.y - 5} r="1.5" fill="#4ade80">
                  <animate attributeName="opacity" values="1;0.4;1" dur="2s" repeatCount="indefinite" />
                </circle>
              )}
            </g>
          );
        })}

        {projects.length > max && (
          <text x={rm.w - 10} y={rm.h - 6} fill="#fff" fontSize="7" fontFamily="'Press Start 2P',monospace" textAnchor="end" opacity=".4">
            +{projects.length - max}
          </text>
        )}

        {agents.map(a => (
          <g
            key={a.id}
            onMouseEnter={() => setHoveredAgentId(a.id)}
            onMouseLeave={() => setHoveredAgentId(null)}
            style={{ cursor: "pointer" }}
          >
            <Character agent={a} x={a.x} y={a.y} frame={a.frame} dir={a.dx > 0 ? 1 : -1} />
            {/* 호버 감지 영역 (캐릭터보다 살짝 크게) */}
            <rect x={a.x - 2} y={a.y - 2} width="18" height="26" fill="transparent" />
          </g>
        ))}

        {/* 툴팁은 SVG 맨 마지막에 렌더링 (항상 위에 표시) */}
        {hoveredAgent && hoveredAgent.room === rm.key && (
          <AgentTooltip
            agent={hoveredAgent}
            x={hoveredAgent.x}
            y={hoveredAgent.y}
            roomW={rm.w}
          />
        )}
      </svg>

      <div style={{ background: rm.wallColor, padding: "4px 10px", display: "flex", alignItems: "center", justifyContent: "space-between", borderRadius: "0 0 4px 4px" }}>
        <span style={{ fontFamily: "'Press Start 2P',monospace", fontSize: 7, color: rm.color, letterSpacing: 1 }}>{rm.label}</span>
        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
          {isServerRoom && projects.filter(p => p.serverUrl).length > 0 && (
            <span style={{ fontFamily: "'Press Start 2P',monospace", fontSize: 5, color: "#4ade80" }}>
              ● {projects.filter(p => p.serverUrl).length} LIVE
            </span>
          )}
          <span style={{ fontFamily: "'Press Start 2P',monospace", fontSize: 6, color: "#666" }}>{projects.length}</span>
        </div>
      </div>
    </div>
  );
}
