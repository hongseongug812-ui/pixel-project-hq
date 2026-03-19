# Pixel HQ — AI 회사 God View Dashboard

위에서 내려다보는 픽셀아트 AI 회사. AI 직원 6명이 돌아다니며 프로젝트를 관리한다.

## 실행

```bash
npm install
npm run dev
```

## 레이아웃

```
┌─────────────┬────────────────────────────┬──────────┐
│  LEFT SIDE  │       OFFICE ROOMS         │  DETAIL  │
│             │                            │  PANEL   │
│ 🚨 Alerts  │  [연구실] [메인 사무실]     │          │
│ ⚠️ Warnings │  [서버실] [CEO 오피스]      │ (클릭시) │
│ 📡 Servers  │  [라운지] [회의실] [창고]   │          │
│ 🤖 Agents   │                            │          │
│ 📜 Log      │  AI 직원들이 돌아다님       │          │
└─────────────┴────────────────────────────┴──────────┘
```

## 기능

- **God View** — 7개 방에서 프로젝트를 탑뷰로 관리
- **AI 직원 6명** — Claude, Gemini, Codex, Devin, Cursor, Copilot
- **왼쪽 사이드바** — 긴급 알림, 방치 경고, 서버 상태, 에이전트 현황, 실시간 로그
- **방치 경고** — 3일 주황, 7일 빨강 (깜빡임)
- **파일 드래그&드롭** — package.json 드롭으로 자동 등록
- **서버 URL** — 프로젝트별 모니터링 대상 등록
- **localStorage** — 새로고침해도 유지

## 구조

```
src/
├── components/
│   ├── AddModal.jsx       # 프로젝트 추가 모달
│   ├── DetailPanel.jsx    # 우측 상세 패널
│   ├── LeftSidebar.jsx    # 왼쪽: 알림/에이전트/로그
│   ├── OfficeRoom.jsx     # 방 렌더러 (SVG)
│   └── Sprites.jsx        # 모든 SVG 스프라이트
├── data/
│   ├── constants.js       # 에이전트, 방, 상태, 슬롯 설정
│   └── projects.js        # 시드 프로젝트 데이터
├── utils/
│   └── helpers.js         # 유틸 (방치 계산, 파일 파서 등)
├── styles/
│   └── global.css         # 글로벌 스타일 + 애니메이션
├── App.jsx                # 메인 앱
└── main.jsx               # 엔트리
```

## 커스터마이징

- **AI 직원 추가**: `src/data/constants.js` → AGENTS
- **방 추가/크기 변경**: `src/data/constants.js` → ROOMS, DESK_SLOTS
- **프로젝트**: `src/data/projects.js` 또는 UI에서 직접
- **스프라이트 추가**: `src/components/Sprites.jsx`
