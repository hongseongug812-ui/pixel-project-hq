// ═══ All SVG pixel art sprites for the office ═══
import type { Agent, Project } from "../types";

interface MonitorProps { x: number; y: number; sc?: string; on?: boolean; progress?: number; serverUrl?: string | null; }
export function Monitor({ x, y, sc = "#3a6a8a", on = true, progress = 0, serverUrl = null }: MonitorProps) {
  const progW = Math.round(20 * Math.max(0, Math.min(100, progress)) / 100);
  return (
    <g transform={`translate(${x},${y})`}>
      <rect x="0" y="0" width="24" height="18" rx="2" fill="#2e2e34" />
      <rect x="1" y="1" width="22" height="14" rx="1" fill="#3a3a42" />
      <rect x="2" y="2" width="20" height="12" fill={on ? "#060c14" : "#181820"} />
      {on && (
        <>
          {serverUrl ? (
            <>
              <rect x="4" y="3" width="6" height="1" fill={sc} opacity=".6" />
              <rect x="4" y="5" width="12" height="1" fill={sc} opacity=".3" />
              <rect x="4" y="7" width="9" height="1" fill={sc} opacity=".4" />
              <rect x="4" y="9" width="14" height="1" fill={sc} opacity=".2" />
              <rect x="4" y="11" width="2" height="1" fill={sc} opacity=".9">
                <animate attributeName="opacity" values="0.9;0;0.9" dur="1s" repeatCount="indefinite" />
              </rect>
            </>
          ) : (
            <>
              <rect x="4" y="4" width="10" height="1" fill={sc} opacity=".5" />
              <rect x="4" y="6" width="14" height="1" fill={sc} opacity=".35" />
              <rect x="4" y="8" width="7" height="1" fill={sc} opacity=".45" />
              <rect x="4" y="10" width="12" height="1" fill={sc} opacity=".3" />
            </>
          )}
          <rect x="2" y="12" width="20" height="1.5" fill="#0a0a0f" />
          {progW > 0 && <rect x="2" y="12" width={progW} height="1.5" fill={sc} opacity=".8" />}
          <rect x="2" y="2" width="20" height="12" fill={sc} opacity=".05" />
        </>
      )}
      <rect x="10" y="18" width="4" height="4" fill="#3a3a40" />
      <rect x="6" y="22" width="12" height="2" rx="1" fill="#44444a" />
    </g>
  );
}

interface DeskProps { x: number; y: number; w?: number; }
export function Desk({ x, y, w = 36 }: DeskProps) {
  return (
    <g transform={`translate(${x},${y})`}>
      <rect x="0" y="0" width={w} height="5" rx="1" fill="#8a6a20" />
      <rect x="2" y="1" width={w * 0.4} height="1" fill="#9a7a30" opacity=".3" />
      <rect x={w * 0.5} y="2" width={w * 0.3} height="1" fill="#7a5a10" opacity=".3" />
      <rect x="2" y="5" width="3" height="12" fill="#6a5018" />
      <rect x={w - 5} y="5" width="3" height="12" fill="#6a5018" />
      <rect x="1" y="16" width={w - 2} height="1" fill="#5a4010" opacity=".4" />
    </g>
  );
}

interface ChairProps { x: number; y: number; }
export function Chair({ x, y }: ChairProps) {
  return (
    <g transform={`translate(${x},${y})`}>
      <rect x="2" y="0" width="12" height="6" rx="2" fill="#404050" />
      <rect x="1" y="6" width="14" height="4" rx="2" fill="#4a4a5a" />
      <rect x="3" y="10" width="2" height="2" fill="#333" />
      <rect x="11" y="10" width="2" height="2" fill="#333" />
      <circle cx="4" cy="13" r="1.5" fill="#2a2a30" />
      <circle cx="12" cy="13" r="1.5" fill="#2a2a30" />
      <rect x="7" y="10" width="2" height="3" fill="#3a3a44" />
    </g>
  );
}

interface PlantProps { x: number; y: number; big?: boolean; }
export function Plant({ x, y, big = false }: PlantProps) {
  const s = big ? 1.4 : 1;
  return (
    <g transform={`translate(${x},${y}) scale(${s})`}>
      <rect x="3" y="10" width="8" height="7" rx="1" fill="#6b4226" />
      <rect x="4" y="11" width="6" height="1" fill="#7a5030" opacity=".4" />
      <ellipse cx="7" cy="8" rx="6" ry="5" fill="#2e7d32" />
      <ellipse cx="5" cy="5" rx="4" ry="4" fill="#388e3c" />
      <ellipse cx="9" cy="6" rx="4" ry="3.5" fill="#2e7d32" />
      <ellipse cx="7" cy="3" rx="3" ry="3" fill="#43a047" />
    </g>
  );
}

interface BookshelfProps { x: number; y: number; }
export function Bookshelf({ x, y }: BookshelfProps) {
  const books: [number, number, string, number][] = [
    [2,2,"#e74c3c",3],[6,2,"#3498db",2.5],[10,2,"#2ecc71",3],[14,2,"#f39c12",2],
    [2,11,"#9b59b6",2.5],[6,11,"#1abc9c",3],[11,11,"#e67e22",2.5],[15,11,"#3498db",2],
    [2,20,"#2980b9",3],[6,20,"#c0392b",2],[10,20,"#27ae60",2.5],[14,20,"#8e44ad",3],
  ];
  return (
    <g transform={`translate(${x},${y})`}>
      <rect x="0" y="0" width="20" height="28" rx="1" fill="#5a4220" />
      <rect x="1" y="1" width="18" height="8" fill="#4a3218" />
      <rect x="1" y="10" width="18" height="8" fill="#4a3218" />
      <rect x="1" y="19" width="18" height="8" fill="#4a3218" />
      {books.map(([bx, by, c, bw], i) => (
        <rect key={i} x={bx} y={by} width={bw} height="6" fill={c} rx=".5" />
      ))}
    </g>
  );
}

interface ServerRackProps { x: number; y: number; active?: boolean; }
export function ServerRack({ x, y, active = true }: ServerRackProps) {
  return (
    <g transform={`translate(${x},${y})`}>
      <rect x="0" y="0" width="18" height="30" rx="1" fill="#1e1e28" />
      <rect x="1" y="1" width="16" height="28" fill="#16161e" />
      {[2, 9, 16, 23].map((ry, i) => (
        <g key={i}>
          <rect x="2" y={ry} width="14" height="5" fill="#0e0e16" rx="1" />
          <circle cx="5" cy={ry + 2.5} r="1.2" fill={active && i < 2 ? "#4ade80" : i === 2 ? "#facc15" : "#333"}>
            {active && i < 2 && <animate attributeName="opacity" values="1;0.4;1" dur={`${1.5 + i * 0.3}s`} repeatCount="indefinite" />}
          </circle>
          <rect x="8" y={ry + 1} width="6" height="1" fill="#252530" />
          <rect x="8" y={ry + 3} width="4" height="1" fill="#1e1e28" />
        </g>
      ))}
      <rect x="1" y="0" width="1" height="30" fill="#ffffff" opacity=".02" />
    </g>
  );
}

interface ServerNodeProps { x: number; y: number; proj: Project; isSel: boolean; roomColor: string; onSelect: (id: number | string) => void; }
export function ServerNode({ x, y, proj, isSel, roomColor, onSelect }: ServerNodeProps) {
  const STATUS_COLORS: Record<string, string> = { active:"#4ade80", pivot:"#facc15", complete:"#60a5fa", paused:"#a78bfa" };
  const sc = STATUS_COLORS[proj.status] || "#4ade80";
  const progW = Math.round(32 * Math.max(0, Math.min(100, proj.progress)) / 100);
  const domain = (proj.serverUrl || "").replace(/^https?:\/\//, "").slice(0, 12);

  return (
    <g onClick={e => { e.stopPropagation(); onSelect(proj.id); }} style={{ cursor: "pointer" }}>
      {isSel && <rect x={x - 3} y={y - 14} width="44" height="36" fill={roomColor} opacity=".18" rx="2" />}
      <rect x={x} y={y - 12} width="38" height="26" rx="1" fill="#14141e" stroke={sc} strokeWidth="0.6" />
      <rect x={x + 1} y={y - 11} width="36" height="6" fill="#0a0a12" />
      <rect x={x + 2} y={y - 10} width="18" height="4" rx="0.5" fill="#0e0e18" />
      <rect x={x + 22} y={y - 10} width="14" height="4" rx="0.5" fill="#0e0e18" />
      <circle cx={x + 4} cy={y - 8} r="1.2" fill="#4ade80">
        <animate attributeName="opacity" values="1;0.3;1" dur="2.1s" repeatCount="indefinite" />
      </circle>
      <circle cx={x + 8} cy={y - 8} r="1.2" fill={proj.priority === "high" ? "#ef4444" : "#333"}>
        {proj.priority === "high" && <animate attributeName="opacity" values="1;0.2;1" dur="0.8s" repeatCount="indefinite" />}
      </circle>
      <circle cx={x + 12} cy={y - 8} r="1.2" fill={sc} opacity=".8" />
      <circle cx={x + 33} cy={y - 8} r="2.5" fill="#111" stroke="#222" strokeWidth=".5" />
      <circle cx={x + 33} cy={y - 8} r="1" fill="#1a1a24" />
      <rect x={x + 1} y={y - 3} width="36" height="1" fill="#1a1a28" />
      <text x={x + 2} y={y + 4} fill={sc} fontSize="3" fontFamily="'Press Start 2P',monospace" opacity=".8">
        {domain}
      </text>
      <rect x={x + 1} y={y + 8} width="36" height="2" fill="#0a0a10" />
      {progW > 0 && <rect x={x + 1} y={y + 8} width={progW} height="2" fill={sc} opacity=".6" />}
      <text x={x + 2} y={y + 14} fill="#333" fontSize="3" fontFamily="'Press Start 2P',monospace">
        {(proj.name || "").slice(0, 10)}
      </text>
    </g>
  );
}

interface WhiteboardProps { x: number; y: number; w?: number; }
export function Whiteboard({ x, y, w = 32 }: WhiteboardProps) {
  return (
    <g transform={`translate(${x},${y})`}>
      <rect x="0" y="0" width={w} height="22" rx="1" fill="#e8e8e8" />
      <rect x="1" y="1" width={w - 2} height="20" fill="#f5f5f5" />
      <rect x="4" y="4" width={w * 0.5} height="1" fill="#e53935" opacity=".5" />
      <rect x="4" y="7" width={w * 0.7} height="1" fill="#1e88e5" opacity=".4" />
      <rect x="4" y="10" width={w * 0.4} height="1" fill="#43a047" opacity=".4" />
      <rect x="4" y="13" width={w * 0.6} height="1" fill="#fb8c00" opacity=".3" />
      <rect x={w / 2 - 3} y="22" width="6" height="2" fill="#999" />
    </g>
  );
}

interface WaterCoolerProps { x: number; y: number; }
export function WaterCooler({ x, y }: WaterCoolerProps) {
  return (
    <g transform={`translate(${x},${y})`}>
      <rect x="3" y="10" width="10" height="14" rx="1" fill="#ccc" />
      <rect x="4" y="11" width="8" height="8" fill="#e0f0ff" />
      <rect x="2" y="0" width="12" height="10" rx="2" fill="#a0d0f0" opacity=".7" />
      <circle cx="7" cy="22" r="1" fill="#999" />
    </g>
  );
}

interface SofaProps { x: number; y: number; color?: string; }
export function Sofa({ x, y, color = "#6a4a7a" }: SofaProps) {
  return (
    <g transform={`translate(${x},${y})`}>
      <rect x="0" y="4" width="36" height="14" rx="3" fill={color} />
      <rect x="2" y="0" width="8" height="14" rx="2" fill={color} opacity=".85" />
      <rect x="26" y="0" width="8" height="14" rx="2" fill={color} opacity=".85" />
      <rect x="10" y="2" width="16" height="10" rx="1" fill={color} opacity=".6" />
      <rect x="2" y="16" width="4" height="3" rx="1" fill="#333" />
      <rect x="30" y="16" width="4" height="3" rx="1" fill="#333" />
    </g>
  );
}

interface MeetingTableProps { x: number; y: number; }
export function MeetingTable({ x, y }: MeetingTableProps) {
  return (
    <g transform={`translate(${x},${y})`}>
      <ellipse cx="30" cy="14" rx="28" ry="12" fill="#5a3a18" />
      <ellipse cx="30" cy="13" rx="26" ry="10" fill="#6a4a20" />
      <ellipse cx="30" cy="12" rx="24" ry="9" fill="#7a5a28" opacity=".5" />
      <rect x="28" y="24" width="4" height="8" fill="#4a3010" />
    </g>
  );
}

interface ClockProps { x: number; y: number; }
export function Clock({ x, y }: ClockProps) {
  return (
    <g transform={`translate(${x},${y})`}>
      <circle cx="6" cy="6" r="6" fill="#eee" />
      <circle cx="6" cy="6" r="5" fill="#fff" />
      <line x1="6" y1="6" x2="6" y2="2.5" stroke="#333" strokeWidth="0.8" />
      <line x1="6" y1="6" x2="9" y2="6" stroke="#e53935" strokeWidth="0.5" />
      <circle cx="6" cy="6" r="0.5" fill="#333" />
    </g>
  );
}

interface PrinterProps { x: number; y: number; }
export function Printer({ x, y }: PrinterProps) {
  return (
    <g transform={`translate(${x},${y})`}>
      <rect x="0" y="4" width="16" height="10" rx="1" fill="#ddd" />
      <rect x="1" y="5" width="14" height="4" fill="#bbb" />
      <rect x="2" y="0" width="12" height="5" fill="#eee" rx="1" />
      <rect x="4" y="12" width="8" height="3" fill="#f5f5f0" />
    </g>
  );
}

interface CoffeeProps { x: number; y: number; }
export function Coffee({ x, y }: CoffeeProps) {
  return (
    <g transform={`translate(${x},${y})`}>
      <rect x="1" y="4" width="7" height="6" rx="1" fill="#e8e0d0" />
      <path d="M8,5 Q11,5 11,8 Q11,10 8,10" fill="none" stroke="#e8e0d0" strokeWidth="1.2" />
      <rect x="2" y="3" width="5" height="1.5" fill="#8b4513" rx=".5" />
    </g>
  );
}

interface CharacterProps { agent: Agent; x: number; y: number; frame?: number; dir?: number; }
export function Character({ agent, x, y, frame = 0, dir = 1 }: CharacterProps) {
  const lo = frame % 2;
  return (
    <g transform={`translate(${x},${y})${dir < 0 ? " scale(-1,1)" : ""}`}
       style={dir < 0 ? { transformOrigin: `${x + 7}px ${y}px` } : undefined}>
      <rect x="3" y="0" width="8" height="4" rx="1" fill={agent.hair} />
      <rect x="3" y="3" width="8" height="6" fill={agent.skin} />
      <rect x="5" y="5" width="1.5" height="1.5" rx=".5" fill="#333" />
      <rect x="7.5" y="5" width="1.5" height="1.5" rx=".5" fill="#333" />
      <rect x="2" y="9" width="10" height="8" rx="1" fill={agent.shirt} />
      <rect x="0" y="10" width="2" height="5" rx="1" fill={agent.skin} />
      <rect x="12" y="10" width="2" height="5" rx="1" fill={agent.skin} />
      <rect x={3 + lo} y="17" width="3.5" height="5" rx=".5" fill={agent.pants} />
      <rect x={7.5 - lo} y="17" width="3.5" height="5" rx=".5" fill={agent.pants} />
      <rect x={3 + lo} y="21" width="4" height="2" rx="1" fill="#2a2a30" />
      <rect x={7.5 - lo} y="21" width="4" height="2" rx="1" fill="#2a2a30" />
    </g>
  );
}
