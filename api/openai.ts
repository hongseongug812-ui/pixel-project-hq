// Vercel Edge Function — OpenAI proxy
// 클라이언트에 API 키를 노출하지 않기 위한 서버사이드 프록시
// Vercel 환경변수 OPENAI_API_KEY (server-only) 를 사용
export const config = { runtime: "edge" };

const ALLOWED_MODELS = new Set(["gpt-4o-mini", "gpt-4o"]);
const MAX_TOKENS_CAP = 1000;

export default async function handler(request: Request): Promise<Response> {
  if (request.method !== "POST") {
    return new Response("Method not allowed", { status: 405 });
  }

  // Origin 체크 — 배포 도메인 또는 로컬 dev만 허용
  const origin = request.headers.get("origin") ?? "";
  const allowed =
    origin === "" ||                              // Edge에서 origin 없는 경우
    origin.endsWith(".vercel.app") ||
    origin.startsWith("http://localhost") ||
    origin.startsWith("http://127.0.0.1");
  if (!allowed) {
    return new Response("Forbidden", { status: 403 });
  }

  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    return new Response(
      JSON.stringify({ error: { message: "OPENAI_API_KEY not configured on server" } }),
      { status: 500, headers: { "Content-Type": "application/json" } },
    );
  }

  let body: Record<string, unknown>;
  try {
    body = await request.json() as Record<string, unknown>;
  } catch {
    return new Response(JSON.stringify({ error: { message: "Invalid JSON body" } }), {
      status: 400, headers: { "Content-Type": "application/json" },
    });
  }

  // 모델 화이트리스트 — 비싼 모델 지정 차단
  const model = typeof body.model === "string" ? body.model : "";
  if (!ALLOWED_MODELS.has(model)) {
    return new Response(
      JSON.stringify({ error: { message: `Model not allowed: ${model}` } }),
      { status: 400, headers: { "Content-Type": "application/json" } },
    );
  }

  // max_tokens 상한 강제
  if (typeof body.max_tokens === "number" && body.max_tokens > MAX_TOKENS_CAP) {
    body = { ...body, max_tokens: MAX_TOKENS_CAP };
  }

  const upstream = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify(body),
  });

  const text = await upstream.text();
  return new Response(text, {
    status: upstream.status,
    headers: { "Content-Type": "application/json" },
  });
}
