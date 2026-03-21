/**
 * localStorage에서 JSON을 안전하게 읽고 기본값을 반환한다.
 *
 * - JSON.parse 실패 시 기본값 반환 (예외 전파 없음)
 * - guard 함수로 파싱된 값의 형태를 런타임 검증
 *
 * @example
 * const projects = readStorage("phq6", isProjectArray, []);
 */
export function readStorage<T>(
  key: string,
  guard: (v: unknown) => v is T,
  fallback: T,
): T {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return fallback;
    const parsed: unknown = JSON.parse(raw);
    return guard(parsed) ? parsed : fallback;
  } catch {
    return fallback;
  }
}

/** 값이 null/undefined가 아닌 객체 배열인지 확인 */
export function isObjectArray(v: unknown): v is Record<string, unknown>[] {
  return Array.isArray(v) && v.every(item => item !== null && typeof item === "object");
}

/** 값이 일반 객체(null 제외)인지 확인 */
export function isPlainObject(v: unknown): v is Record<string, unknown> {
  return v !== null && typeof v === "object" && !Array.isArray(v);
}
