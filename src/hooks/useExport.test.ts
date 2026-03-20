import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useExport } from "./useExport";
import type { Project } from "../types";

const mockProject: Project = {
  id: 1, name: "Test App", status: "active", priority: "high",
  progress: 50, lastActivity: "2024-01-01", room: "lab",
  serverUrl: "https://test.vercel.app", githubUrl: "https://github.com/test/repo",
  thumbnail: null, description: "테스트 프로젝트", featured: true,
  startDate: "2024-01-01", endDate: null,
  stack: ["React", "TypeScript"],
  tasks: [{ id: "t1", text: "배포", done: true }],
};

describe("useExport", () => {
  let mockClick: ReturnType<typeof vi.fn>;
  let originalCreateElement: typeof document.createElement;
  let originalCreateObjectURL: typeof URL.createObjectURL;
  let toast: (msg: string, type?: "success" | "warn" | "error", emoji?: string) => void;

  beforeEach(() => {
    toast = vi.fn() as unknown as (msg: string, type?: "success" | "warn" | "error", emoji?: string) => void;
    mockClick = vi.fn();
    originalCreateElement = document.createElement.bind(document);
    originalCreateObjectURL = URL.createObjectURL;

    // Only intercept <a> creation; pass everything else through
    vi.spyOn(document, "createElement").mockImplementation((tag: string, ...rest) => {
      if (tag === "a") {
        return Object.assign(originalCreateElement("a"), { click: mockClick });
      }
      return originalCreateElement(tag, ...rest);
    });

    URL.createObjectURL = vi.fn(() => "blob:mock");
  });

  afterEach(() => {
    vi.restoreAllMocks();
    URL.createObjectURL = originalCreateObjectURL;
  });

  it("exportJSON triggers download with correct filename", () => {
    const { result } = renderHook(() => useExport([mockProject], toast));
    act(() => { result.current.exportJSON(); });
    expect(mockClick).toHaveBeenCalled();
    expect(toast).toHaveBeenCalledWith("JSON 백업 완료", "success", "↓");
  });

  it("exportHTML triggers download with correct filename", () => {
    const { result } = renderHook(() => useExport([mockProject], toast));
    act(() => { result.current.exportHTML(); });
    expect(mockClick).toHaveBeenCalled();
    expect(toast).toHaveBeenCalledWith("HTML 포트폴리오 내보내기 완료", "success", "↓");
  });

  it("exportJSON creates a blob with project data", () => {
    const blobs: string[] = [];
    const OrigBlob = global.Blob;
    global.Blob = class extends OrigBlob {
      constructor(parts: BlobPart[], opts?: BlobPropertyBag) {
        super(parts, opts);
        blobs.push(parts[0] as string);
      }
    } as typeof Blob;

    const { result } = renderHook(() => useExport([mockProject], toast));
    act(() => { result.current.exportJSON(); });

    expect(blobs[0]).toContain("Test App");
    global.Blob = OrigBlob;
  });
});
