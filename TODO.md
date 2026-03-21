# Pixel HQ — 다음 작업 목록

> 마지막 업데이트: 2026-03-21
> 현재 상태: 포트폴리오 A / 실사용 B+ / 보안 B+

---

## 🔒 보안 (우선순위 높음)

- [ ] **Origin 검증 강화** (`api/openai.ts`)
  - 현재: `*.vercel.app` 전체 허용 → 다른 vercel 프로젝트에서 호출 가능
  - 수정: 환경변수 `ALLOWED_ORIGIN`에 실제 배포 URL 지정 후 정확히 비교
  - 예: `if (origin !== process.env.ALLOWED_ORIGIN && origin !== "") return 403`

- [ ] **Discord Webhook 서버 프록시 이전** (`api/notify.ts` 신규)
  - 현재: `VITE_DISCORD_WEBHOOK`이 클라이언트 번들에 노출됨
  - 수정: `/api/notify` Edge Function 만들고, Discord URL은 서버 환경변수로 이전
  - `useAlertWatcher.ts`에서 fetch 대상을 `/api/notify`로 변경

- [ ] **CSP (Content-Security-Policy) 헤더 추가** (`vercel.json`)
  - 예시:
    ```
    "Content-Security-Policy": "default-src 'self'; script-src 'self' 'unsafe-inline'; connect-src 'self' https://*.supabase.co https://api.github.com"
    ```

---

## ⚡ 실사용 성능

- [ ] **Google Fonts를 `index.html`로 이전**
  - 현재: `<link>` 태그가 JSX(App.tsx, 로딩 화면) 안에 있어 리렌더 시 DOM에 중복 삽입
  - 수정: `index.html` `<head>`에 단 한 번만 선언

- [ ] **AutoPilot write 최적화**
  - 현재: tick마다 진행률 업데이트 → Supabase write 과다 발생 가능
  - 수정: 변경값이 실제로 달라질 때만 `updateProject` 호출하도록 조건 추가

---

## 📊 포트폴리오

- [ ] **커밋 히스토리 정리**
  - 현재 커밋이 너무 압축돼 있음 ("혼자 만들었나?" 의심 방지)
  - 기능 단위로 커밋 메시지 영문 병기 고려

---

## 💡 선택적 개선 (여유될 때)

- [ ] PWA 지원 (`vite-plugin-pwa`) — 오프라인 조회
- [ ] `api/openai.ts`에 IP 기반 rate limiting (KV store 필요)
- [ ] 다크/라이트 테마 토글
- [ ] 프로젝트 아카이브 기능 (삭제 대신 숨김)
