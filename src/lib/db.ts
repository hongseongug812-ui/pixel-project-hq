import { supabase } from "./supabase";
import type { Project, Task, ProjectStatus, ProjectPriority, RoomKey } from "../types";

// ── 허용 값 집합 (DB 행 검증에 사용) ─────────────────────────────────
const VALID_STATUSES  = new Set<ProjectStatus>(["active", "pivot", "complete", "paused"]);
const VALID_PRIORITIES = new Set<ProjectPriority>(["high", "medium", "low"]);
const VALID_ROOMS     = new Set<RoomKey>(["lab", "office", "server", "ceo", "lounge", "meeting", "storage"]);

function str(v: unknown, fallback = ""): string {
  return typeof v === "string" ? v : String(fallback);
}
function num(v: unknown, fallback = 0): number {
  return typeof v === "number" && Number.isFinite(v) ? v : fallback;
}
function bool(v: unknown, fallback = false): boolean {
  return typeof v === "boolean" ? v : fallback;
}
function strOrNull(v: unknown): string | null {
  return typeof v === "string" ? v : null;
}
function numOrNull(v: unknown): number | null {
  return typeof v === "number" && Number.isFinite(v) ? v : null;
}

// ── 변환 유틸 ────────────────────────────────────────────────────────
export const FIELD_MAP: Record<string, string> = {
  lastActivity:    "last_activity",
  serverUrl:       "server_url",
  githubUrl:       "github_url",
  thumbnail:       "thumbnail",
  description:     "description",
  featured:        "featured",
  startDate:       "start_date",
  endDate:         "end_date",
  stack:           "stack",
  tasks:           "tasks",
  name:            "name",
  status:          "status",
  progress:        "progress",
  priority:        "priority",
  room:            "room",
  assignedAgentId: "assigned_agent_id",
  budget:          "budget",
  targetDate:      "target_date",
};

export function rowToProject(row: Record<string, unknown>): Project {
  const rawStatus   = row.status as string;
  const rawPriority = row.priority as string;
  const rawRoom     = row.room as string;
  return {
    id:           (typeof row.id === "number" || typeof row.id === "string") ? row.id : 0,
    name:         str(row.name),
    status:       VALID_STATUSES.has(rawStatus as ProjectStatus)   ? rawStatus as ProjectStatus   : "active",
    progress:     Math.max(0, Math.min(100, num(row.progress))),
    priority:     VALID_PRIORITIES.has(rawPriority as ProjectPriority) ? rawPriority as ProjectPriority : "medium",
    lastActivity: str(row.last_activity, new Date().toISOString().slice(0, 10)),
    room:         VALID_ROOMS.has(rawRoom as RoomKey) ? rawRoom as RoomKey : "lab",
    serverUrl:    strOrNull(row.server_url),
    githubUrl:    strOrNull(row.github_url),
    thumbnail:    strOrNull(row.thumbnail),
    description:  strOrNull(row.description),
    featured:     bool(row.featured),
    startDate:    strOrNull(row.start_date),
    endDate:      strOrNull(row.end_date),
    stack:        Array.isArray(row.stack) ? (row.stack as unknown[]).filter((s): s is string => typeof s === "string") : [],
    tasks:        Array.isArray(row.tasks) ? row.tasks as Task[] : [],
    assignedAgentId: strOrNull(row.assigned_agent_id),
    budget:       numOrNull(row.budget),
    targetDate:   strOrNull(row.target_date),
  };
}

function projectToRow(p: Partial<Project>, userId?: string): Record<string, unknown> {
  const row: Record<string, unknown> = {
    name:          p.name,
    status:        p.status        ?? "active",
    progress:      p.progress      ?? 0,
    priority:      p.priority      ?? "medium",
    last_activity: p.lastActivity  ?? new Date().toISOString().slice(0, 10),
    room:          p.room          ?? "lab",
    server_url:    p.serverUrl     ?? null,
    github_url:    p.githubUrl     ?? null,
    thumbnail:     p.thumbnail     ?? null,
    description:   p.description   ?? null,
    featured:      p.featured      ?? false,
    start_date:    p.startDate     ?? null,
    end_date:      p.endDate       ?? null,
    stack:             p.stack             ?? [],
    tasks:             p.tasks             ?? [],
    assigned_agent_id: p.assignedAgentId   ?? null,
    budget:            p.budget            ?? null,
    target_date:       p.targetDate        ?? null,
  };
  if (userId) row.user_id = userId;
  return row;
}

function fieldsToRow(fields: Partial<Project>): Record<string, unknown> {
  const row: Record<string, unknown> = {};
  (Object.entries(fields) as [string, unknown][]).forEach(([k, v]) => {
    const col = FIELD_MAP[k];
    if (col) row[col] = v ?? null;
  });
  return row;
}

// ── CRUD ─────────────────────────────────────────────────────────────
export async function fetchProjects(userId: string): Promise<Project[]> {
  if (!supabase) throw new Error("Supabase not configured");
  const { data, error } = await supabase
    .from("projects")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return (data as Record<string, unknown>[]).map(rowToProject);
}

export async function createProject(project: Partial<Project>, userId: string): Promise<Project> {
  if (!supabase) throw new Error("Supabase not configured");
  const { data, error } = await supabase
    .from("projects")
    .insert(projectToRow(project, userId))
    .select()
    .single();
  if (error) throw error;
  return rowToProject(data);
}

export async function updateProject(id: string | number, fields: Partial<Project>): Promise<Project> {
  if (!supabase) throw new Error("Supabase not configured");
  const { data, error } = await supabase
    .from("projects")
    .update(fieldsToRow(fields))
    .eq("id", id)
    .select()
    .single();
  if (error) throw error;
  return rowToProject(data);
}

export async function deleteProject(id: string | number): Promise<void> {
  if (!supabase) throw new Error("Supabase not configured");
  const { error } = await supabase.from("projects").delete().eq("id", id);
  if (error) throw error;
}

// ── localStorage 데이터 Supabase로 마이그레이션 ─────────────────────
export async function migrateFromLocalStorage(userId: string): Promise<number> {
  try {
    const raw = localStorage.getItem("phq6");
    if (!raw) return 0;
    const projects: Partial<Project>[] = JSON.parse(raw);
    if (!projects.length) return 0;
    if (!supabase) return 0;

    const rows = projects.map(p => projectToRow(p, userId));
    const { error } = await supabase.from("projects").insert(rows);
    if (error) throw error;

    localStorage.removeItem("phq6");
    return projects.length;
  } catch {
    return 0;
  }
}
