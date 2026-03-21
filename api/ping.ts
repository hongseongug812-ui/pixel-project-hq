// Vercel Edge Function — 서버 ping 프록시
// 브라우저 CORS 우회 없이 실제 HTTP 상태 코드로 서버 다운 여부 판단
export const config = { runtime: "edge" };

export default async function handler(request: Request): Promise<Response> {
  const { searchParams } = new URL(request.url);
  const target = searchParams.get("url");

  if (!target) {
    return new Response(JSON.stringify({ error: "Missing url param" }), {
      status: 400, headers: { "Content-Type": "application/json" },
    });
  }

  const full = target.startsWith("http") ? target : `https://${target}`;
  const start = Date.now();

  try {
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), 5000);
    const res = await fetch(full, { method: "HEAD", signal: ctrl.signal });
    clearTimeout(timer);
    const ping = Date.now() - start;
    // 5xx는 down, 그 외(200~4xx)는 up — 서버가 응답하고 있다는 뜻
    const status = res.status >= 500 ? "down" : "up";
    return new Response(
      JSON.stringify({ ping, status, statusCode: res.status }),
      { headers: { "Content-Type": "application/json" } },
    );
  } catch {
    return new Response(
      JSON.stringify({ ping: 999, status: "down", statusCode: 0 }),
      { headers: { "Content-Type": "application/json" } },
    );
  }
}
