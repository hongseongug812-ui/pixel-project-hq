import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useFileDrop } from "./useFileDrop";

type ToastFn = (msg: string, type?: "success" | "warn" | "error", emoji?: string) => void;

/** Creates a FileReader mock class whose onload fires synchronously with given content */
function makeFileReaderClass(content: string) {
  return class MockFileReader {
    onload: ((ev: ProgressEvent<FileReader>) => void) | null = null;
    readAsText() {
      Promise.resolve().then(() => {
        this.onload?.({ target: { result: content } } as unknown as ProgressEvent<FileReader>);
      });
    }
  };
}

describe("useFileDrop", () => {
  let toastMock: ReturnType<typeof vi.fn>;
  let toast: ToastFn;

  beforeEach(() => {
    toastMock = vi.fn();
    toast = toastMock as unknown as ToastFn;
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("starts with dropActive false and fileAnalysis null", () => {
    const { result } = renderHook(() => useFileDrop(toast));
    expect(result.current.dropActive).toBe(false);
    expect(result.current.fileAnalysis).toBeNull();
  });

  it("setDropActive updates dropActive state", () => {
    const { result } = renderHook(() => useFileDrop(toast));
    act(() => { result.current.setDropActive(true); });
    expect(result.current.dropActive).toBe(true);
  });

  it("handleDrop prevents default and sets dropActive false", () => {
    const { result } = renderHook(() => useFileDrop(toast));
    act(() => { result.current.setDropActive(true); });
    const mockEvent = {
      preventDefault: vi.fn(),
      dataTransfer: { files: [] },
    } as unknown as React.DragEvent;
    act(() => { result.current.handleDrop(mockEvent); });
    expect(mockEvent.preventDefault).toHaveBeenCalled();
    expect(result.current.dropActive).toBe(false);
  });

  it("handleDrop does nothing if no file present", () => {
    const { result } = renderHook(() => useFileDrop(toast));
    const mockEvent = {
      preventDefault: vi.fn(),
      dataTransfer: { files: [] },
    } as unknown as React.DragEvent;
    act(() => { result.current.handleDrop(mockEvent); });
    expect(toastMock).not.toHaveBeenCalled();
    expect(result.current.fileAnalysis).toBeNull();
  });

  it("setFileAnalysis can be used to reset state to null", () => {
    const { result } = renderHook(() => useFileDrop(toast));
    act(() => { result.current.setFileAnalysis(null); });
    expect(result.current.fileAnalysis).toBeNull();
  });

  it("handleDrop reads a package.json file and sets fileAnalysis", async () => {
    const content = JSON.stringify({
      name: "my-app",
      dependencies: { react: "^18.0.0" },
    });
    vi.stubGlobal("FileReader", makeFileReaderClass(content));

    const { result } = renderHook(() => useFileDrop(toast));
    const mockFile = new File([content], "package.json", { type: "application/json" });
    const mockEvent = {
      preventDefault: vi.fn(),
      dataTransfer: { files: [mockFile] },
    } as unknown as React.DragEvent;

    act(() => { result.current.handleDrop(mockEvent); });
    await act(async () => { await Promise.resolve(); });

    expect(result.current.fileAnalysis).not.toBeNull();
    expect(result.current.fileAnalysis?.filename).toBe("package.json");
    expect(result.current.fileAnalysis?.analysis.name).toBe("my-app");
  });

  it("handleDrop reads a README.md file and sets fileAnalysis with correct name", async () => {
    const content = "# Awesome Project\n\n## Setup\n\n## Usage";
    vi.stubGlobal("FileReader", makeFileReaderClass(content));

    const { result } = renderHook(() => useFileDrop(toast));
    const mockFile = new File([content], "README.md", { type: "text/markdown" });
    const mockEvent = {
      preventDefault: vi.fn(),
      dataTransfer: { files: [mockFile] },
    } as unknown as React.DragEvent;

    act(() => { result.current.handleDrop(mockEvent); });
    await act(async () => { await Promise.resolve(); });

    expect(result.current.fileAnalysis?.analysis.name).toBe("Awesome Project");
    expect(result.current.fileAnalysis?.filename).toBe("README.md");
  });
});
