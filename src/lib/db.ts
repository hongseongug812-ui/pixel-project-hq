import { supabase } from "./supabase";
import type { Project, Task, ProjectStatus, ProjectPriority, RoomKey } from "../types";

// ── 변환 유틸 ────────────────────────────────────────────────────────
export const FIELD_MAP: Record<string, string> = {
  lastActivity: "last_activity",
  serverUrl:    "server_url",
  githubUrl:    "github_url",
  thumbnail:    "thumbnail",
  description:  "description",
  featured:     "featured",
  startDate:    "start_date",
  endDate:      "end_date",
  stack:        "stack",
  tasks:        "tasks",
  name:         "name",
  status:       "status",
  progress:     "progress",
  priority:     "priority",
  room:         "room",
};

export function rowToProject(row: Record<string, unknown>): Project {
  return {
    id:           row.id as number | string,
    name:         row.name as string,
    status:       row.status        as ProjectStatus,
    progress:     row.progress      as number,
    priority:     row.priority      as ProjectPriority,
    lastActivity: row.last_activity as string,
    room:         row.room          as RoomKey,
    serverUrl:    (row.server_url   ?? null) as string | null,
    githubUrl:    (row.github_url   ?? null) as string | null,
    thumbnail:    (row.thumbnail    ?? null) as string | null,
    description:  (row.description  ?? null) as string | null,
    featured:     (row.featured     ?? false) as boolean,
    startDate:    (row.start_date   ?? null) as string | null,
    endDate:      (row.end_date     ?? null) as string | null,
    stack:        (row.stack        ?? []) as string[],
    tasks:        (row.tasks        ?? []) as Task[],
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
    stack:         p.stack         ?? [],
    tasks:         p.tasks         ?? [],
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
