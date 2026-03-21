import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";

// Dev-only API middleware: /api/openai, /api/ping
// 프로덕션(Vercel)에서는 api/ 폴더의 Edge Functions가 처리
function devApiPlugin(devApiKey) {
  return {
    name: "dev-api",
    configureServer(server) {
      // POST /api/openai → OpenAI 직접 호출 (dev key 사용)
      server.middlewares.use("/api/openai", (req, res) => {
        if (req.method !== "POST") { res.statusCode = 405; res.end(); return; }
        let body = "";
        req.on("data", (d) => { body += d; });
        req.on("end", async () => {
          try {
            const upstream = await fetch("https://api.openai.com/v1/chat/completions", {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${devApiKey}`,
              },
              body,
            });
            const text = await upstream.text();
            res.statusCode = upstream.status;
            res.setHeader("Content-Type", "application/json");
            res.end(text);
          } catch (e) {
            res.statusCode = 500;
            res.end(JSON.stringify({ error: { message: String(e) } }));
          }
        });
      });

      // GET /api/ping?url=... → 실제 HEAD 요청 (서버사이드라 CORS 없음)
      server.middlewares.use("/api/ping", async (req, res) => {
        const urlParam = new URL(req.url, "http://localhost").searchParams.get("url");
        if (!urlParam) { res.statusCode = 400; res.end('{"error":"Missing url"}'); return; }
        const full = urlParam.startsWith("http") ? urlParam : `https://${urlParam}`;
        const start = Date.now();
        try {
          const ctrl = new AbortController();
          const t = setTimeout(() => ctrl.abort(), 5000);
          const r = await fetch(full, { method: "HEAD", signal: ctrl.signal });
          clearTimeout(t);
          const ping = Date.now() - start;
          const status = r.status >= 500 ? "down" : "up";
          res.setHeader("Content-Type", "application/json");
          res.end(JSON.stringify({ ping, status, statusCode: r.status }));
        } catch {
          res.setHeader("Content-Type", "application/json");
          res.end(JSON.stringify({ ping: 999, status: "down", statusCode: 0 }));
        }
      });
    },
  };
}

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "");
  const devApiKey = env.VITE_OPENAI_API_KEY || env.OPENAI_API_KEY || "";

  return {
    plugins: [react(), devApiPlugin(devApiKey)],
    server: {
      port: 3000,
      open: true,
    },
  };
});
