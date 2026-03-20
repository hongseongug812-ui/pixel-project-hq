// ── Core domain types ─────────────────────────────────────────────────

export type ProjectStatus = "active" | "pivot" | "complete" | "paused";
export type ProjectPriority = "high" | "medium" | "low";
export type RoomKey = "lab" | "office" | "server" | "ceo" | "lounge" | "meeting" | "storage";

export interface Task {
  id: string;
  text: string;
  done: boolean;
}

export interface Project {
  id: number | string;
  name: string;
  status: ProjectStatus;
  priority: ProjectPriority;
  progress: number;
  lastActivity: string;
  room: RoomKey;
  serverUrl: string | null;
  githubUrl: string | null;
  thumbnail: string | null;
  description: string | null;
  featured: boolean;
  startDate: string | null;
  endDate: string | null;
  stack: string[];
  tasks: Task[];
  assignedAgentId: string | null;
  budget: number | null;
  targetDate: string | null;
}

// ── Agent types ───────────────────────────────────────────────────────

export interface Agent {
  id: string;
  name: string;
  role: string;
  hair: string;
  skin: string;
  shirt: string;
  pants: string;
  body: string;
  emoji: string;
  task: string;
}

export interface AgentState extends Agent {
  room: RoomKey;
  x: number;
  y: number;
  frame: number;
  dx: number;
  currentTask: string;
}

// ── Room types ────────────────────────────────────────────────────────

export interface Room {
  key: RoomKey;
  label: string;
  w: number;
  h: number;
  color: string;
  wallColor: string;
  wallDark: string;
  floorA: string;
  floorB: string;
  trim: string;
}

export interface DeskSlot {
  x: number;
  y: number;
}

// ── Log types ─────────────────────────────────────────────────────────

export interface LogEntry {
  agent: string;
  color: string;
  emoji: string;
  msg: string;
  time: string;
}

// ── Server monitoring types ───────────────────────────────────────────

export interface ServerStat {
  ping: number;
  uptime: number;
  status: "up" | "down";
  lastCheck?: string;
  real?: boolean;
  simulated?: boolean;
}

export type ServerStatsMap = Record<string, ServerStat>;

// ── UI types ──────────────────────────────────────────────────────────

export interface ToastItem {
  id: number;
  msg: string;
  type: "success" | "warn" | "error";
  emoji: string;
  undoId?: number;
}

export type StatusMap = Record<ProjectStatus, { label: string; color: string }>;
