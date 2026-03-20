import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useMigration } from "./useMigration";

vi.mock("../lib/db", () => ({
  migrateFromLocalStorage: vi.fn(),
  fetchProjects: vi.fn(),
}));

import * as db from "../lib/db";
import type { Project } from "../types";

type ToastFn = (msg: string, type?: "success" | "warn" | "error", emoji?: string) => void;
type SetProjectsFn = (fn: (p: Project[]) => Project[]) => void;

const KEY = "phq6";

describe("useMigration", () => {
  let setProjectsMock: ReturnType<typeof vi.fn>;
  let toastMock: ReturnType<typeof vi.fn>;
  let pushLogMock: ReturnType<typeof vi.fn>;
  let setProjects: SetProjectsFn;
  let toast: ToastFn;
  let pushLog: (msg: string, emoji?: string, color?: string) => void;
  const user = { id: "user-1" };

  beforeEach(() => {
    setProjectsMock = vi.fn();
    toastMock = vi.fn();
    pushLogMock = vi.fn();
    setProjects = setProjectsMock as unknown as SetProjectsFn;
    toast = toastMock as unknown as ToastFn;
    pushLog = pushLogMock as unknown as (msg: string, emoji?: string, color?: string) => void;
    localStorage.clear();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it("starts with migrateBanner false", () => {
    const { result } = renderHook(() => useMigration(user, setProjects, toast, pushLog));
    expect(result.current.migrateBanner).toBe(false);
  });

  it("checkLocalData sets migrateBanner true when valid local data exists", () => {
    localStorage.setItem(KEY, JSON.stringify([{ id: 1, name: "test" }]));
    const { result } = renderHook(() => useMigration(user, setProjects, toast, pushLog));
    act(() => { result.current.checkLocalData(); });
    expect(result.current.migrateBanner).toBe(true);
  });

  it("checkLocalData does not set banner when localStorage is empty", () => {
    const { result } = renderHook(() => useMigration(user, setProjects, toast, pushLog));
    act(() => { result.current.checkLocalData(); });
    expect(result.current.migrateBanner).toBe(false);
  });

  it("checkLocalData does not set banner when localStorage has empty array", () => {
    localStorage.setItem(KEY, JSON.stringify([]));
    const { result } = renderHook(() => useMigration(user, setProjects, toast, pushLog));
    act(() => { result.current.checkLocalData(); });
    expect(result.current.migrateBanner).toBe(false);
  });

  it("checkLocalData silently ignores invalid JSON", () => {
    localStorage.setItem(KEY, "not-json");
    const { result } = renderHook(() => useMigration(user, setProjects, toast, pushLog));
    act(() => { result.current.checkLocalData(); });
    expect(result.current.migrateBanner).toBe(false);
  });

  it("dismissMigrate sets banner to false and removes localStorage key", () => {
    localStorage.setItem(KEY, JSON.stringify([{ id: 1 }]));
    const { result } = renderHook(() => useMigration(user, setProjects, toast, pushLog));
    act(() => { result.current.checkLocalData(); });
    expect(result.current.migrateBanner).toBe(true);
    act(() => { result.current.dismissMigrate(); });
    expect(result.current.migrateBanner).toBe(false);
    expect(localStorage.getItem(KEY)).toBeNull();
  });

  it("handleMigrate does nothing when user is null", async () => {
    const { result } = renderHook(() => useMigration(null, setProjects, toast, pushLog));
    await act(async () => { await result.current.handleMigrate(); });
    expect(db.migrateFromLocalStorage).not.toHaveBeenCalled();
  });

  it("handleMigrate calls db functions and shows toast when count > 0", async () => {
    vi.mocked(db.migrateFromLocalStorage).mockResolvedValue(3);
    vi.mocked(db.fetchProjects).mockResolvedValue([]);
    const { result } = renderHook(() => useMigration(user, setProjects, toast, pushLog));
    await act(async () => { await result.current.handleMigrate(); });
    expect(db.migrateFromLocalStorage).toHaveBeenCalledWith("user-1");
    expect(toastMock).toHaveBeenCalledWith(expect.stringContaining("3"), "success", "📦");
    expect(result.current.migrateBanner).toBe(false);
  });

  it("handleMigrate hides banner even when count is 0", async () => {
    vi.mocked(db.migrateFromLocalStorage).mockResolvedValue(0);
    const { result } = renderHook(() => useMigration(user, setProjects, toast, pushLog));
    await act(async () => { await result.current.handleMigrate(); });
    expect(result.current.migrateBanner).toBe(false);
    expect(toastMock).not.toHaveBeenCalled();
  });
});
