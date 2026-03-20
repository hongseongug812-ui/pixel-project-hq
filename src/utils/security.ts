// ── URL Safety ────────────────────────────────────────────────────────
const ALLOWED_PROTOCOLS = ["http:", "https:"];

/**
 * 검증된 URL만 새 탭으로 엽니다.
 * - javascript:, data:, blob: 등 위험 스킴 차단
 * - http/https로 시작하지 않으면 https:// 자동 추가
 */
export function safeOpenUrl(url: string | null | undefined): void {
  if (!url?.trim()) return;
  const full = url.startsWith("http") ? url : `https://${url}`;
  try {
    const parsed = new URL(full);
    if (!ALLOWED_PROTOCOLS.includes(parsed.protocol)) return;
    window.open(parsed.href, "_blank", "noopener,noreferrer");
  } catch {
    // 유효하지 않은 URL은 무시
  }
}

// ── Input Validation ──────────────────────────────────────────────────
export interface ProjectValidationError {
  field: string;
  message: string;
}

const LIMITS = {
  name:        { max: 120 },
  description: { max: 500 },
  stackItem:   { max: 50  },
  stackCount:  { max: 20  },
  taskText:    { max: 200 },
  taskCount:   { max: 50  },
  url:         { max: 300 },
} as const;

export function validateProjectInput(fields: {
  name?: string;
  description?: string | null;
  stack?: string[];
  tasks?: { text: string }[];
  serverUrl?: string | null;
  githubUrl?: string | null;
}): ProjectValidationError | null {
  if (fields.name !== undefined) {
    const n = fields.name.trim();
    if (!n) return { field: "name", message: "프로젝트 이름은 필수입니다." };
    if (n.length > LIMITS.name.max) return { field: "name", message: `이름은 ${LIMITS.name.max}자 이내여야 합니다.` };
  }

  if (fields.description) {
    if (fields.description.length > LIMITS.description.max)
      return { field: "description", message: `설명은 ${LIMITS.description.max}자 이내여야 합니다.` };
  }

  if (fields.stack) {
    if (fields.stack.length > LIMITS.stackCount.max)
      return { field: "stack", message: `스택은 최대 ${LIMITS.stackCount.max}개입니다.` };
    for (const s of fields.stack) {
      if (s.length > LIMITS.stackItem.max)
        return { field: "stack", message: `스택 항목은 ${LIMITS.stackItem.max}자 이내여야 합니다.` };
    }
  }

  if (fields.tasks) {
    if (fields.tasks.length > LIMITS.taskCount.max)
      return { field: "tasks", message: `태스크는 최대 ${LIMITS.taskCount.max}개입니다.` };
    for (const t of fields.tasks) {
      if (t.text.length > LIMITS.taskText.max)
        return { field: "tasks", message: `태스크 내용은 ${LIMITS.taskText.max}자 이내여야 합니다.` };
    }
  }

  for (const urlField of ["serverUrl", "githubUrl"] as const) {
    const u = fields[urlField];
    if (u && u.length > LIMITS.url.max)
      return { field: urlField, message: `URL은 ${LIMITS.url.max}자 이내여야 합니다.` };
  }

  return null;
}

// ── Rate Limiter ──────────────────────────────────────────────────────
/**
 * 마지막 호출 이후 minInterval ms가 지나지 않았으면 false 반환
 */
export function makeRateLimiter(minIntervalMs: number) {
  let last = 0;
  return function allow(): boolean {
    const now = Date.now();
    if (now - last < minIntervalMs) return false;
    last = now;
    return true;
  };
}
