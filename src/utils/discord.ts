const TIMEOUT_MS = 8000;

/**
 * Discord 웹훅으로 메시지 전송.
 * @returns true if 200 OK, false otherwise (네트워크 오류·타임아웃 포함)
 */
export async function sendDiscord(
  webhookUrl: string,
  content: string,
  options?: { username?: string },
): Promise<boolean> {
  const url = webhookUrl.trim();
  if (!url) return false;
  try {
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), TIMEOUT_MS);
    const body: Record<string, string> = { content };
    if (options?.username) body.username = options.username;
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
      signal: ctrl.signal,
    });
    clearTimeout(timer);
    return res.ok;
  } catch {
    return false;
  }
}
