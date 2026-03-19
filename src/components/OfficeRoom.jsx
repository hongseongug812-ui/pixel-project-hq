import { ROOMS, STATUS_MAP, ROOM_MAX_DESKS, DESK_SLOTS } from "../data/constants";
import { neglect } from "../utils/helpers";
import { Monitor, Desk, Chair, Plant, Bookshelf, ServerRack, Whiteboard, WaterCooler, Sofa, MeetingTable, Clock, Printer, Coffee, Character, ServerNode } from "./Sprites";

function RoomDecorations({ roomKey, w, h }) {
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

export default function OfficeRoom({ roomCfg, projects, agents, selectedId, onSelect }) {
  const rm = roomCfg;
  const T = 10;
  const cols = Math.floor(rm.w / T), rows = Math.floor(rm.h / T);
  const max = ROOM_MAX_DESKS[rm.key] || 6;
  const slots = DESK_SLOTS[rm.key] || [];
  const isServerRoom = rm.key === "server";

  return (
    <div style={{ display: "inline-block", verticalAlign: "top" }}>
      <svg width={rm.w} height={rm.h} viewBox={`0 0 ${rm.w} ${rm.h}`}
        style={{ display: "block", imageRendering: "pixelated", borderRadius: "4px 4px 0 0", overflow: "hidden" }}>
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

        {/* Floor tiles */}
        {Array.from({ length: rows }, (_, r) =>
          Array.from({ length: cols }, (_, c) => (
            <rect key={`${r}-${c}`} x={c * T} y={r * T} width={T} height={T}
              fill={(r + c) % 2 === 0 ? rm.floorA : rm.floorB} />
          ))
        )}

        {/* Walls */}
        <rect x="0" y="0" width={rm.w} height="10" fill={rm.wallColor} />
        <rect x="0" y="10" width={rm.w} height="3" fill={rm.trim} />
        <rect x="0" y="0" width="6" height={rm.h} fill={rm.wallDark} />
        <rect x={rm.w - 6} y="0" width="6" height={rm.h} fill={rm.wallDark} />
        <rect x="0" y={rm.h - 3} width={rm.w} height="3" fill={rm.wallDark} opacity=".3" />

        {/* Door */}
        <rect x={rm.w / 2 - 12} y="0" width="24" height="13" fill={rm.floorA} />
        <rect x={rm.w / 2 - 13} y="0" width="2" height="13" fill="#6a5020" />
        <rect x={rm.w / 2 + 11} y="0" width="2" height="13" fill="#6a5020" />
        <rect x={rm.w / 2 - 12} y="11" width="24" height="2" fill="#5a4018" />

        {/* Room decorations */}
        <RoomDecorations roomKey={rm.key} w={rm.w} h={rm.h} />

        {/* Ghost desks for empty slots */}
        {slots.slice(Math.min(projects.length, max), max).map((slot, i) => (
          <g key={`ghost-${i}`} opacity="0.55">
            <Chair x={slot.x + 10} y={slot.y + 20} />
            <Desk x={slot.x} y={slot.y} />
            <Monitor x={slot.x + 6} y={slot.y - 20} sc="#445566" on={false} />
          </g>
        ))}

        {/* Project desks */}
        {projects.slice(0, max).map((proj, i) => {
          const slot = slots[i];
          if (!slot) return null;
          const st = STATUS_MAP[proj.status];
          const nl = neglect(proj.lastActivity, proj.status);
          const isSel = proj.id === selectedId;

          // Server room: deployed projects get special server node display
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
              {/* Monitor with glow for active/deployed projects */}
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

        {/* Walking agents */}
        {agents.map(a => (
          <Character key={a.id} agent={a} x={a.x} y={a.y} frame={a.frame} dir={a.dx > 0 ? 1 : -1} />
        ))}
      </svg>

      {/* Room label bar */}
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
