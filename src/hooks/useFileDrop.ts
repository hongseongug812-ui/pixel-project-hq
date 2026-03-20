import { useState, useCallback } from "react";
import { analyzeFile } from "../utils/helpers";
import type { FileAnalysisResult } from "../utils/helpers";
import type { ToastItem } from "../types";

interface FileAnalysisState {
  analysis: FileAnalysisResult;
  filename: string;
  rawContent: string;
}

type ToastFn = (msg: string, type?: ToastItem["type"], emoji?: string) => void;

export function useFileDrop(toast: ToastFn) {
  const [dropActive, setDropActive] = useState(false);
  const [fileAnalysis, setFileAnalysis] = useState<FileAnalysisState | null>(null);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDropActive(false);
    const f = e.dataTransfer.files[0];
    if (!f) return;
    const r = new FileReader();
    r.onload = ev => {
      const content = ev.target?.result as string;
      const analysis = analyzeFile(content, f.name);
      if (analysis) {
        setFileAnalysis({ analysis, filename: f.name, rawContent: content });
      } else {
        toast("지원하지 않는 파일 형식입니다", "warn", "⚠️");
      }
    };
    r.readAsText(f);
  }, [toast]);

  return { dropActive, setDropActive, fileAnalysis, setFileAnalysis, handleDrop };
}
