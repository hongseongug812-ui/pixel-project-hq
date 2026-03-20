import { useCallback } from "react";
import type { Project, ToastItem } from "../types";

type ToastFn = (msg: string, type?: ToastItem["type"], emoji?: string) => void;

export function useExport(projects: Project[], toast: ToastFn) {
  const exportJSON = useCallback(() => {
    const blob = new Blob([JSON.stringify(projects, null, 2)], { type: "application/json" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `pixel-hq-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    toast("JSON 백업 완료", "success", "↓");
  }, [projects, toast]);

  const exportHTML = useCallback(() => {
    const SC: Record<string, string> = { active: "#4ade80", pivot: "#facc15", complete: "#60a5fa", paused: "#a78bfa" };
    const cards = projects.map(p => {
      const sc = SC[p.status] || "#888";
      const stack = (p.stack || []).map(s => `<span style="font-size:10px;color:${sc};background:${sc}18;padding:2px 7px;border:1px solid ${sc}33;font-family:monospace">${s}</span>`).join(" ");
      const live = p.serverUrl ? `<a href="${p.serverUrl.startsWith("http") ? p.serverUrl : "https://" + p.serverUrl}" target="_blank" style="font-size:11px;color:#000;background:#4ade80;padding:4px 10px;text-decoration:none;font-family:monospace">LIVE ↗</a>` : "";
      const gh = p.githubUrl ? `<a href="${p.githubUrl.startsWith("http") ? p.githubUrl : "https://" + p.githubUrl}" target="_blank" style="font-size:11px;color:#a78bfa;background:#a78bfa18;padding:4px 10px;text-decoration:none;font-family:monospace;border:1px solid #a78bfa33">GitHub ↗</a>` : "";
      const thumb = p.thumbnail
        ? `<img src="${p.thumbnail}" style="width:100%;height:140px;object-fit:cover;display:block"/>`
        : `<div style="height:80px;background:linear-gradient(135deg,${sc}18,${sc}06);display:flex;align-items:center;justify-content:center;font-size:28px;color:${sc};opacity:.5;font-family:monospace">${p.name.slice(0, 2).toUpperCase()}</div>`;
      return `<div style="background:#0e0e14;border:1px solid ${p.featured ? "#facc1533" : "#1a1a28"};border-radius:6px;overflow:hidden">${p.featured ? '<div style="background:#facc1518;padding:4px 10px;font-size:10px;color:#facc15;font-family:monospace;border-bottom:1px solid #facc1522">★ FEATURED</div>' : ""}${thumb}<div style="padding:14px"><div style="display:flex;justify-content:space-between;margin-bottom:6px"><div style="font-family:monospace;font-size:13px;color:#ddd;font-weight:bold">${p.name}</div><span style="font-size:9px;color:${sc};background:${sc}22;padding:2px 6px;font-family:monospace">${p.status.toUpperCase()}</span></div>${p.description ? `<div style="font-size:12px;color:#888;margin-bottom:8px">${p.description}</div>` : ""}<div style="display:flex;flex-wrap:wrap;gap:4px;margin-bottom:10px">${stack}</div><div style="height:3px;background:#1a1a22;margin-bottom:10px"><div style="width:${p.progress}%;height:100%;background:${sc}"></div></div><div style="display:flex;gap:6px">${live}${gh}</div></div></div>`;
    }).join("\n");
    const html = `<!DOCTYPE html><html lang="ko"><head><meta charset="UTF-8"><title>Portfolio</title><style>*{box-sizing:border-box;margin:0;padding:0}body{background:#0d0d12;color:#ccc;font-family:sans-serif;padding:40px 20px}h1{font-family:monospace;font-size:28px;color:#facc15;letter-spacing:4px;margin-bottom:32px}.grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(280px,1fr));gap:16px}</style></head><body><h1>⬤ PORTFOLIO</h1><div class="grid">${cards}</div></body></html>`;
    const blob = new Blob([html], { type: "text/html" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `portfolio-${new Date().toISOString().slice(0, 10)}.html`;
    a.click();
    toast("HTML 포트폴리오 내보내기 완료", "success", "↓");
  }, [projects, toast]);

  return { exportJSON, exportHTML };
}
