import { useState, useEffect, useMemo } from "react";
import { readStorage, isPlainObject } from "../utils/storage";
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

function isCacheRecord(v: unknown): v is Record<string, CacheEntry> {
  return isPlainObject(v);
}

function loadCache(): Record<string, CacheEntry> {
  return readStorage(CACHE_KEY, isCacheRecord, {});
}

function saveCache(cache: Record<string, CacheEntry>) {
  try {
    localStorage.setItem(CACHE_KEY, JSON.stringify(cache));
  } catch { /* ignore */ }
}

export function useGitHub(projects: Project[]) {
  const [commitMap, setCommitMap] = useState<GitCommitMap>({});
  const [loading, setLoading] = useState<Set<string | number>>(new Set());

  // 프로젝트 ID + githubUrl 조합 — useEffect deps로 사용해 매 렌더마다 문자열 생성 방지
  const projectsKey = useMemo(
    () => projects.map(p => `${p.id}:${p.githubUrl ?? ""}`).join(","),
    [projects]
  );

  useEffect(() => {
    const githubProjects = projects.filter(p => p.githubUrl?.includes("github.com"));
    if (githubProjects.length === 0) return;

    const cache = loadCache();
    const now = Date.now();

    // 만료된 캐시 항목 정리 (TTL 초과분 제거)
    const staleKeys = Object.keys(cache).filter(k => now - cache[k].fetchedAt >= CACHE_TTL);
    if (staleKeys.length > 0) {
      const cleaned = { ...cache };
      staleKeys.forEach(k => delete cleaned[k]);
      saveCache(cleaned);
    }

    const controller = new AbortController();

    async function fetchProject(project: Project) {
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
          signal: controller.signal,
        });

        if (!res.ok) return;

        interface GitHubCommitResponse {
          sha: string;
          commit: { message: string; author: { name: string; date: string } };
          html_url: string;
        }
        function isGitHubResponse(data: unknown): data is GitHubCommitResponse[] {
          return Array.isArray(data) && data.every(c =>
            c !== null && typeof c === "object" &&
            typeof c.sha === "string" &&
            typeof c.html_url === "string" &&
            typeof c.commit?.message === "string"
          );
        }
        const json = await res.json();
        if (!isGitHubResponse(json)) return;

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
      } catch (err) {
        if ((err as Error).name !== "AbortError") {
          /* silent: no GitHub token, rate limit, etc. */
        }
      } finally {
        setLoading(prev => { const next = new Set(prev); next.delete(project.id); return next; });
      }
    }

    Promise.all(githubProjects.map(fetchProject));

    return () => controller.abort();
  }, [projectsKey]);

  return { commitMap, loading };
}
