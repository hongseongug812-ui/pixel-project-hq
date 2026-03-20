import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import Toast from "./Toast";
import type { ToastItem } from "../types";

const baseToast = (overrides: Partial<ToastItem> = {}): ToastItem => ({
  id: 1,
  msg: "작업 완료",
  type: "success",
  emoji: "✓",
  ...overrides,
});

describe("Toast", () => {
  it("renders nothing when toasts array is empty", () => {
    const { container } = render(<Toast toasts={[]} onUndo={vi.fn()} />);
    expect(container.firstChild).toBeNull();
  });

  it("renders a toast message", () => {
    render(<Toast toasts={[baseToast()]} onUndo={vi.fn()} />);
    expect(screen.getByText(/작업 완료/)).toBeInTheDocument();
  });

  it("renders emoji with message", () => {
    render(<Toast toasts={[baseToast({ emoji: "🎉", msg: "성공" })]} onUndo={vi.fn()} />);
    expect(screen.getByText(/🎉 성공/)).toBeInTheDocument();
  });

  it("renders multiple toasts", () => {
    const toasts: ToastItem[] = [
      baseToast({ id: 1, msg: "첫 번째" }),
      baseToast({ id: 2, msg: "두 번째" }),
    ];
    render(<Toast toasts={toasts} onUndo={vi.fn()} />);
    expect(screen.getByText(/첫 번째/)).toBeInTheDocument();
    expect(screen.getByText(/두 번째/)).toBeInTheDocument();
  });

  it("does not show undo button when undoId is absent", () => {
    render(<Toast toasts={[baseToast()]} onUndo={vi.fn()} />);
    expect(screen.queryByText(/취소/)).toBeNull();
  });

  it("shows undo button when undoId is present", () => {
    render(<Toast toasts={[baseToast({ undoId: 42 })]} onUndo={vi.fn()} />);
    expect(screen.getByText(/취소/)).toBeInTheDocument();
  });

  it("calls onUndo with undoId when undo button is clicked", () => {
    const onUndo = vi.fn();
    render(<Toast toasts={[baseToast({ id: 99, undoId: 99 })]} onUndo={onUndo} />);
    fireEvent.click(screen.getByText(/취소/));
    expect(onUndo).toHaveBeenCalledWith(99);
  });
});
