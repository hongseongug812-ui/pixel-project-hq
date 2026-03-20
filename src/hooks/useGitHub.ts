import { useState, useEffect } from "react";
import type { Project } from "../types";

export interface GitCommit {
  sha: string;
  message: string;
  author: string;
  date: string;
  url: string;
}

export type GitCommitMap = Record<string | number, GitCommit[]>;

function extractRepoPath(githubUrl: string): string | null {
  try {
    const match = githubUrl.match(/github\.com\/([^/]+\/[^/]+?)(?:\.git)?(?:\/.*)?$/);
    return match ? match[1] : null;
  } catch {
    return null;
  }
}

const CACHE_KEY = "phq_github_commits";
const CACHE_TTL = 10 * 60 * 1000; // 10 minutes

interface CacheEntry {
  data: GitCommit[];
  fetchedAt: number;
}

function loadCache(): Record<string, CacheEntry> {
  try {
    const raw = localStorage.getItem(CACHE_KEY);
    if (raw) return JSON.parse(raw);
  } catch { /* ignore */ }
  return {};
}

function saveCache(cache: Record<string, CacheEntry>) {
  try {
    localStorage.setItem(CACHE_KEY, JSON.stringify(cache));
  } catch { /* ignore */ }
}

export function useGitHub(projects: Project[]) {
  const [commitMap, setCommitMap] = useState<GitCommitMap>({});
  const [loading, setLoading] = useState<Set<string | number>>(new Set());

  useEffect(() => {
    const githubProjects = projects.filter(p => p.githubUrl?.includes("github.com"));
    if (githubProjects.length === 0) return;

    const cache = loadCache();
    const now = Date.now();

    githubProjects.forEach(async (project) => {
      const repoPath = extractRepoPath(project.githubUrl!);
      if (!repoPath) return;

      // Check cache
      const cached = cache[repoPath];
      if (cached && now - cached.fetchedAt < CACHE_TTL) {
        setCommitMap(prev => ({ ...prev, [project.id]: cached.data }));
        return;
      }

      setLoading(prev => new Set(prev).add(project.id));

      try {
        const res = await fetch(`https://api.github.com/repos/${repoPath}/commits?per_page=5`, {
          headers: { Accept: "application/vnd.github.v3+json" },
        });

        if (!res.ok) return;

        const json = await res.json() as Array<{
          sha: string;
          commit: { message: string; author: { name: string; date: string } };
          html_url: string;
        }>;

        const commits: GitCommit[] = json.map(c => ({
          sha: c.sha.slice(0, 7),
          message: c.commit.message.split("\n")[0].slice(0, 72),
          author: c.commit.author.name,
          date: c.commit.author.date,
          url: c.html_url,
        }));

        setCommitMap(prev => ({ ...prev, [project.id]: commits }));

        // Update cache
        const newCache = { ...loadCache(), [repoPath]: { data: commits, fetchedAt: now } };
        saveCache(newCache);
      } catch {
        /* silent: no GitHub token, rate limit, etc. */
      } finally {
        setLoading(prev => { const next = new Set(prev); next.delete(project.id); return next; });
      }
    });
  }, [projects.map(p => p.id + (p.githubUrl ?? "")).join(",")]);

  function refreshProject(project: Project) {
    const repoPath = extractRepoPath(project.githubUrl ?? "");
    if (!repoPath) return;
    const cache = loadCache();
    delete cache[repoPath];
    saveCache(cache);
    // Re-trigger by clearing commitMap entry
    setCommitMap(prev => { const next = { ...prev }; delete next[project.id]; return next; });
  }

  return { commitMap, loading, refreshProject };
}
