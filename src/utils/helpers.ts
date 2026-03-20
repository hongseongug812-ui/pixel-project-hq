import type { Task } from "../types";

export const daysSince = (d: string): number =>
  Math.floor((Date.now() - new Date(d).getTime()) / 864e5);

export const neglect = (d: string, s: string): 0 | 1 | 2 => {
  if (s === "complete") return 0;
  const n = daysSince(d);
  return n >= 7 ? 2 : n >= 3 ? 1 : 0;
};

export function timeNow(): string {
  const n = new Date();
  return `${String(n.getHours()).padStart(2, "0")}:${String(n.getMinutes()).padStart(2, "0")}`;
}

export interface FileAnalysisResult {
  name: string;
  stack: string[];
  tasks: Task[];
  detected: string;
  version?: string | null;
  room: string;
  priority?: string;
}

export function analyzeFile(content: string, filename = ""): FileAnalysisResult | null {
  const fname = filename.toLowerCase();
  const ts = Date.now();

  // ── package.json ──
  try {
    const d = JSON.parse(content);
    if (d.name && (d.scripts !== undefined || d.dependencies !== undefined || d.devDependencies !== undefined)) {
      const deps: Record<string, string> = { ...d.dependencies, ...d.devDependencies };
      const scripts: Record<string, string> = d.scripts || {};
      const stack: string[] = [];
      const tasks: Task[] = [];

      if (deps["next"]) stack.push("Next.js");
      else if (deps["react"] || deps["react-dom"]) stack.push("React");
      if (deps["vue"]) stack.push("Vue");
      if (deps["svelte"]) stack.push("Svelte");
      if (deps["express"] || deps["fastify"] || deps["hono"] || deps["koa"]) stack.push("Node");
      if (deps["typescript"] || deps["@types/node"]) stack.push("TypeScript");
      if (deps["prisma"] || deps["drizzle-orm"] || deps["mongoose"] || deps["sequelize"]) stack.push("DB");
      if (deps["tailwindcss"]) stack.push("Tailwind");
      if (deps["@supabase/supabase-js"]) stack.push("Supabase");
      if (deps["firebase"] || deps["firebase-admin"]) stack.push("Firebase");
      if (deps["openai"] || deps["@anthropic-ai/sdk"]) stack.push("AI");
      if (deps["stripe"]) stack.push("Stripe");

      if (!scripts.test && !deps["jest"] && !deps["vitest"])
        tasks.push({ id: `t${ts}1`, text: "테스트 환경 구축 (jest/vitest)", done: false });
      if (!deps["eslint"] && !deps["@biomejs/biome"])
        tasks.push({ id: `t${ts}2`, text: "린터 설정 (ESLint/Biome)", done: false });
      if (!scripts.build && !scripts.deploy)
        tasks.push({ id: `t${ts}3`, text: "빌드 & 배포 파이프라인 설정", done: false });
      if (deps["prisma"]) {
        if (!scripts["db:migrate"] && !scripts["migrate"])
          tasks.push({ id: `t${ts}4`, text: "DB 마이그레이션 스크립트 작성", done: false });
        tasks.push({ id: `t${ts}5`, text: "Prisma Studio로 데이터 모델 확인", done: false });
      }
      if (!d.description)
        tasks.push({ id: `t${ts}6`, text: "README 및 문서 작성", done: false });
      if (deps["stripe"])
        tasks.push({ id: `t${ts}7`, text: "Stripe 웹훅 엔드포인트 테스트", done: false });
      if (deps["openai"] || deps["@anthropic-ai/sdk"])
        tasks.push({ id: `t${ts}8`, text: "API 키 환경변수 .env 보안 확인", done: false });
      if (stack.includes("Next.js"))
        tasks.push({ id: `t${ts}9`, text: "Lighthouse 성능 점수 확인", done: false });
      tasks.push({ id: `t${ts}10`, text: "npm audit — 취약점 패키지 점검", done: false });

      const depCount = Object.keys(deps).length;
      return {
        name: d.name,
        stack: stack.slice(0, 6),
        tasks,
        detected: `package.json — ${depCount}개 패키지 · ${stack.join(", ") || "스택 미감지"}`,
        version: d.version || null,
        room: stack.includes("Next.js") || stack.includes("React") || stack.includes("Vue")
          ? "office"
          : stack.includes("DB") || stack.includes("Supabase")
          ? "server"
          : "lab",
      };
    }
  } catch { /* not json */ }

  // ── README.md / .md ──
  if (fname.includes("readme") || fname.endsWith(".md") || content.trimStart().startsWith("#")) {
    const lines = content.split("\n");
    const title = lines.find(l => l.startsWith("# "))?.replace(/^#\s+/, "").trim()
      || filename.replace(/\.md$/i, "") || "새 프로젝트";
    const h2Sections = lines.filter(l => l.startsWith("## ")).map(l => l.replace(/^##\s+/, "").trim());
    const tasks: Task[] = h2Sections.slice(0, 8).map((s, i) => ({ id: `t${ts}${i}`, text: s, done: false }));
    if (tasks.length === 0) {
      tasks.push(
        { id: `t${ts}0`, text: "요구사항 분석", done: false },
        { id: `t${ts}1`, text: "기술 스택 선정", done: false },
        { id: `t${ts}2`, text: "초기 세팅 및 보일러플레이트", done: false },
      );
    }
    return { name: title, stack: [], tasks, detected: `README 분석 — ${h2Sections.length}개 섹션 감지`, room: "lab" };
  }

  // ── .env ──
  if (fname.includes(".env")) {
    const keys = content.split("\n")
      .filter(l => l.trim() && !l.startsWith("#"))
      .map(l => l.split("=")[0].trim())
      .filter(Boolean);
    const tasks: Task[] = [
      { id: `t${ts}0`, text: "모든 환경변수 프로덕션 값으로 교체", done: false },
      { id: `t${ts}1`, text: ".env 파일 .gitignore 등록 확인", done: false },
      ...keys.slice(0, 4).map((k, i) => ({ id: `t${ts}${i + 2}`, text: `${k} 키 유효성 검증`, done: false })),
    ];
    return { name: filename || "환경변수 설정", stack: [], tasks, detected: `.env 파일 — ${keys.length}개 키 감지`, room: "server" };
  }

  // ── 기타 ──
  const lines = content.split("\n").filter(l => l.trim()).slice(0, 100);
  const firstLine = lines[0]?.trim() || filename || "새 프로젝트";
  return {
    name: firstLine.replace(/^[#*\-\s]+/, "").slice(0, 50) || filename,
    stack: [],
    tasks: [
      { id: `t${ts}0`, text: "파일 내용 분석 및 계획 수립", done: false },
      { id: `t${ts}1`, text: "초기 세팅", done: false },
    ],
    detected: `${filename} — ${lines.length}줄 감지`,
    room: "lab",
  };
}
