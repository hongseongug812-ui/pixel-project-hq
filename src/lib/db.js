import { supabase } from "./supabase";

// ── 변환 유틸 ────────────────────────────────────────────────────────
export const FIELD_MAP = {
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

export function rowToProject(row) {
  return {
    id:           row.id,
    name:         row.name,
    status:       row.status,
    progress:     row.progress,
    priority:     row.priority,
    lastActivity: row.last_activity,
    room:         row.room,
    serverUrl:    row.server_url   ?? null,
    githubUrl:    row.github_url   ?? null,
    thumbnail:    row.thumbnail    ?? null,
    description:  row.description  ?? null,
    featured:     row.featured     ?? false,
    startDate:    row.start_date   ?? null,
    endDate:      row.end_date     ?? null,
    stack:        row.stack        ?? [],
    tasks:        row.tasks        ?? [],
  };
}

function projectToRow(p, userId) {
  const row = {
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

function fieldsToRow(fields) {
  const row = {};
  Object.entries(fields).forEach(([k, v]) => {
    const col = FIELD_MAP[k];
    if (col) row[col] = v ?? null;
  });
  return row;
}

// ── CRUD ─────────────────────────────────────────────────────────────
export async function fetchProjects(userId) {
  const { data, error } = await supabase
    .from("projects")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return data.map(rowToProject);
}

export async function createProject(project, userId) {
  const { data, error } = await supabase
    .from("projects")
    .insert(projectToRow(project, userId))
    .select()
    .single();
  if (error) throw error;
  return rowToProject(data);
}

export async function updateProject(id, fields) {
  const { data, error } = await supabase
    .from("projects")
    .update(fieldsToRow(fields))
    .eq("id", id)
    .select()
    .single();
  if (error) throw error;
  return rowToProject(data);
}

export async function deleteProject(id) {
  const { error } = await supabase.from("projects").delete().eq("id", id);
  if (error) throw error;
}

// ── localStorage 데이터 Supabase로 마이그레이션 ─────────────────────
export async function migrateFromLocalStorage(userId) {
  try {
    const raw = localStorage.getItem("phq6");
    if (!raw) return 0;
    const projects = JSON.parse(raw);
    if (!projects.length) return 0;

    const rows = projects.map(p => projectToRow(p, userId));
    const { error } = await supabase.from("projects").insert(rows);
    if (error) throw error;

    localStorage.removeItem("phq6");
    return projects.length;
  } catch {
    return 0;
  }
}
