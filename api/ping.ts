// Vercel Edge Function — 서버 ping 프록시
// 브라우저 CORS 우회 없이 실제 HTTP 상태 코드로 서버 다운 여부 판단
export const config = { runtime: "edge" };

// 사설 IP 대역 & 위험 호스트 차단 (SSRF 방지)
function isPrivateHost(hostname: string): boolean {
  // localhost / loopback
  if (hostname === "localhost" || hostname === "127.0.0.1" || hostname === "::1") return true;
  // AWS 메타데이터
  if (hostname === "169.254.169.254") return true;
  // IPv4 사설 대역
  const ipv4 = hostname.match(/^(\d+)\.(\d+)\.(\d+)\.(\d+)$/);
  if (ipv4) {
    const [, a, b] = ipv4.map(Number);
    if (a === 10) return true;
    if (a === 172 && b >= 16 && b <= 31) return true;
    if (a === 192 && b === 168) return true;
  }
  return false;
}

export default async function handler(request: Request): Promise<Response> {
  const { searchParams } = new URL(request.url);
  const target = searchParams.get("url");

  if (!target) {
    return new Response(JSON.stringify({ error: "Missing url param" }), {
      status: 400, headers: { "Content-Type": "application/json" },
    });
  }

  const full = target.startsWith("http") ? target : `https://${target}`;

  // 프로토콜 및 호스트 검증
  let parsed: URL;
  try {
    parsed = new URL(full);
  } catch {
    return new Response(JSON.stringify({ error: "Invalid URL" }), {
      status: 400, headers: { "Content-Type": "application/json" },
    });
  }
  if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
    return new Response(JSON.stringify({ error: "Protocol not allowed" }), {
      status: 400, headers: { "Content-Type": "application/json" },
    });
  }
  if (isPrivateHost(parsed.hostname)) {
    return new Response(JSON.stringify({ error: "Private hosts not allowed" }), {
      status: 400, headers: { "Content-Type": "application/json" },
    });
  }

  const start = Date.now();

  try {
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), 5000);
    const res = await fetch(parsed.href, { method: "HEAD", signal: ctrl.signal });
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
