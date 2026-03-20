import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useToast } from "./useToast";

describe("useToast", () => {
  beforeEach(() => { vi.useFakeTimers(); });
  afterEach(() => { vi.useRealTimers(); });

  it("starts with empty toasts", () => {
    const { result } = renderHook(() => useToast());
    expect(result.current.toasts).toHaveLength(0);
  });

  it("adds a toast when toast() is called", () => {
    const { result } = renderHook(() => useToast());
    act(() => { result.current.toast("Hello"); });
    expect(result.current.toasts).toHaveLength(1);
    expect(result.current.toasts[0].msg).toBe("Hello");
    expect(result.current.toasts[0].type).toBe("success");
    expect(result.current.toasts[0].emoji).toBe("✓");
  });

  it("uses provided type and emoji", () => {
    const { result } = renderHook(() => useToast());
    act(() => { result.current.toast("Error!", "error", "💥"); });
    expect(result.current.toasts[0].type).toBe("error");
    expect(result.current.toasts[0].emoji).toBe("💥");
  });

  it("removes toast after 3 seconds", () => {
    const { result } = renderHook(() => useToast());
    act(() => { result.current.toast("Goodbye"); });
    expect(result.current.toasts).toHaveLength(1);
    act(() => { vi.advanceTimersByTime(3000); });
    expect(result.current.toasts).toHaveLength(0);
  });

  it("keeps only last 5 toasts (slice -4 + new)", () => {
    const { result } = renderHook(() => useToast());
    act(() => {
      for (let i = 0; i < 6; i++) result.current.toast(`msg ${i}`);
    });
    expect(result.current.toasts.length).toBeLessThanOrEqual(5);
  });
});
