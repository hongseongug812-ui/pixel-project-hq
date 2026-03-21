import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import { useGitHub } from "./useGitHub";
import { makeProject } from "../test/fixtures";

const MOCK_COMMITS = [
  {
    sha: "abc1234567890",
    commit: { message: "feat: add feature\nlong body", author: { name: "Alice", date: "2024-01-01T00:00:00Z" } },
    html_url: "https://github.com/owner/repo/commit/abc1234567890",
  },
  {
    sha: "def9876543210",
    commit: { message: "fix: bug", author: { name: "Bob", date: "2024-01-02T00:00:00Z" } },
    html_url: "https://github.com/owner/repo/commit/def9876543210",
  },
];

describe("useGitHub", () => {
  beforeEach(() => {
    localStorage.clear();
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({
      ok: true,
      json: async () => MOCK_COMMITS,
    }));
  });

  afterEach(() => {
    vi.restoreAllMocks();
    localStorage.clear();
  });

  it("does nothing when no projects have githubUrl", () => {
    const project = makeProject({ githubUrl: null });
    const { result } = renderHook(() => useGitHub([project]));
    expect(result.current.commitMap).toEqual({});
    expect(vi.mocked(fetch)).not.toHaveBeenCalled();
  });

  it("does nothing for non-github URLs", () => {
    const project = makeProject({ githubUrl: "https://gitlab.com/owner/repo" });
    renderHook(() => useGitHub([project]));
    expect(vi.mocked(fetch)).not.toHaveBeenCalled();
  });

  it("fetches commits for github project", async () => {
    const project = makeProject({ id: 1, githubUrl: "https://github.com/owner/repo" });
    const { result } = renderHook(() => useGitHub([project]));

    await waitFor(() => expect(result.current.commitMap[1]).toBeDefined());

    expect(result.current.commitMap[1]).toHaveLength(2);
    expect(result.current.commitMap[1][0].sha).toBe("abc1234"); // sliced to 7
    expect(result.current.commitMap[1][0].message).toBe("feat: add feature"); // first line only
    expect(result.current.commitMap[1][0].author).toBe("Alice");
  });

  it("saves fetched commits to localStorage cache", async () => {
    const project = makeProject({ id: 1, githubUrl: "https://github.com/owner/repo" });
    const { result } = renderHook(() => useGitHub([project]));

    await waitFor(() => expect(result.current.commitMap[1]).toBeDefined());

    const cached = JSON.parse(localStorage.getItem("phq_github_commits") ?? "{}");
    expect(cached["owner/repo"]).toBeDefined();
    expect(cached["owner/repo"].data).toHaveLength(2);
  });

  it("uses cached commits within TTL without fetching", async () => {
    const repoPath = "owner/repo";
    const cachedData = MOCK_COMMITS.map(c => ({
      sha: c.sha.slice(0, 7),
      message: c.commit.message,
      author: c.commit.author.name,
      date: c.commit.author.date,
      url: c.html_url,
    }));
    localStorage.setItem("phq_github_commits", JSON.stringify({
      [repoPath]: { data: cachedData, fetchedAt: Date.now() },
    }));

    const project = makeProject({ id: 1, githubUrl: "https://github.com/owner/repo" });
    const { result } = renderHook(() => useGitHub([project]));

    await waitFor(() => expect(result.current.commitMap[1]).toBeDefined());

    // Should NOT fetch — served from cache
    expect(vi.mocked(fetch)).not.toHaveBeenCalled();
    expect(result.current.commitMap[1]).toHaveLength(2);
  });

  it("re-fetches when cache is expired", async () => {
    const repoPath = "owner/repo";
    const expiredTime = Date.now() - 11 * 60 * 1000; // 11 minutes ago (TTL = 10 min)
    localStorage.setItem("phq_github_commits", JSON.stringify({
      [repoPath]: { data: [], fetchedAt: expiredTime },
    }));

    const project = makeProject({ id: 1, githubUrl: "https://github.com/owner/repo" });
    const { result } = renderHook(() => useGitHub([project]));

    await waitFor(() => expect(result.current.commitMap[1]).toBeDefined());

    expect(vi.mocked(fetch)).toHaveBeenCalledOnce();
    expect(result.current.commitMap[1]).toHaveLength(2);
  });

  it("silently ignores non-OK responses", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: false }));
    const project = makeProject({ id: 1, githubUrl: "https://github.com/owner/repo" });
    const { result } = renderHook(() => useGitHub([project]));

    // loading should clear even on error
    await waitFor(() => expect(result.current.loading.has(1)).toBe(false));
    expect(result.current.commitMap[1]).toBeUndefined();
  });

  it("rejects invalid (non-array) API response", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ message: "Bad credentials" }), // object, not array
    }));
    const project = makeProject({ id: 1, githubUrl: "https://github.com/owner/repo" });
    const { result } = renderHook(() => useGitHub([project]));

    await waitFor(() => expect(result.current.loading.has(1)).toBe(false));
    expect(result.current.commitMap[1]).toBeUndefined();
  });

  it("rejects array items missing required fields", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({
      ok: true,
      json: async () => [{ sha: "abc", commit: { message: "hi" } }], // missing html_url
    }));
    const project = makeProject({ id: 1, githubUrl: "https://github.com/owner/repo" });
    const { result } = renderHook(() => useGitHub([project]));

    await waitFor(() => expect(result.current.loading.has(1)).toBe(false));
    expect(result.current.commitMap[1]).toBeUndefined();
  });

  it("extracts repo path from various github URL formats", async () => {
    const project = makeProject({
      id: 2,
      githubUrl: "https://github.com/owner/repo.git",
    });
    const { result } = renderHook(() => useGitHub([project]));

    await waitFor(() => expect(result.current.commitMap[2]).toBeDefined());

    const [url] = vi.mocked(fetch).mock.calls[0] as [string, ...unknown[]];
    expect(url).toContain("/owner/repo/commits");
  });

  it("shows loading state while fetching", async () => {
    let resolve: (v: unknown) => void;
    const pending = new Promise(r => { resolve = r; });
    vi.stubGlobal("fetch", vi.fn().mockReturnValue(pending));

    const project = makeProject({ id: 1, githubUrl: "https://github.com/owner/repo" });
    const { result } = renderHook(() => useGitHub([project]));

    expect(result.current.loading.has(1)).toBe(true);

    resolve!({ ok: true, json: async () => MOCK_COMMITS });
    await waitFor(() => expect(result.current.loading.has(1)).toBe(false));
  });
});
