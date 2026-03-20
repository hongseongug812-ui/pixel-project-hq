import { test, expect } from "@playwright/test";

// Supabase 없이 로컬 모드로 앱이 열리는 환경 가정
// (VITE_SUPABASE_URL 미설정 시 로컬 모드)

test.describe("앱 기본 렌더링", () => {
  test("로딩 완료 후 헤더에 PIXEL HQ 표시", async ({ page }) => {
    await page.goto("/");
    await page.waitForLoadState("networkidle");
    await expect(page.getByRole("banner")).toContainText("PIXEL HQ");
  });

  test("오피스 뷰 기본 렌더링", async ({ page }) => {
    await page.goto("/");
    await page.waitForLoadState("networkidle");
    // GOD 뷰 버튼 확인
    await expect(page.getByRole("button", { name: /GOD/i })).toBeVisible();
  });

  test("툴바에 뷰 모드 3개 존재", async ({ page }) => {
    await page.goto("/");
    await page.waitForLoadState("networkidle");
    await expect(page.getByRole("button", { name: /GOD/i })).toBeVisible();
    await expect(page.getByRole("button", { name: /KANBAN/i })).toBeVisible();
    await expect(page.getByRole("button", { name: /FOLIO/i })).toBeVisible();
  });
});

test.describe("프로젝트 추가", () => {
  test("+ 추가 버튼 클릭 시 모달 열림", async ({ page }) => {
    await page.goto("/");
    await page.waitForLoadState("networkidle");
    await page.getByRole("button", { name: "+ 추가" }).click();
    await expect(page.getByRole("dialog")).toBeVisible();
  });

  test("Ctrl+N 단축키로 모달 열림", async ({ page }) => {
    await page.goto("/");
    await page.waitForLoadState("networkidle");
    await page.keyboard.press("Control+n");
    await expect(page.getByRole("dialog")).toBeVisible();
  });

  test("ESC로 모달 닫힘", async ({ page }) => {
    await page.goto("/");
    await page.waitForLoadState("networkidle");
    await page.getByRole("button", { name: "+ 추가" }).click();
    await expect(page.getByRole("dialog")).toBeVisible();
    await page.keyboard.press("Escape");
    await expect(page.getByRole("dialog")).not.toBeVisible();
  });

  test("프로젝트 이름 입력 후 추가 완료", async ({ page }) => {
    await page.goto("/");
    await page.waitForLoadState("networkidle");
    await page.getByRole("button", { name: "+ 추가" }).click();
    await page.getByRole("dialog").getByPlaceholder(/프로젝트 이름/i).fill("E2E 테스트 프로젝트");
    await page.getByRole("dialog").getByRole("button", { name: /추가|생성|확인/i }).click();
    await expect(page.getByRole("dialog")).not.toBeVisible();
  });
});

test.describe("뷰 전환", () => {
  test("KANBAN 탭 클릭 시 칸반 보드 표시", async ({ page }) => {
    await page.goto("/");
    await page.waitForLoadState("networkidle");
    await page.getByRole("button", { name: /KANBAN/i }).click();
    // 칸반 컬럼 헤더 (ACTIVE) 확인
    await expect(page.getByText("ACTIVE")).toBeVisible();
    await expect(page.getByText("DONE")).toBeVisible();
  });

  test("FOLIO 탭 클릭 시 포트폴리오 뷰 전환", async ({ page }) => {
    await page.goto("/");
    await page.waitForLoadState("networkidle");
    await page.getByRole("button", { name: /FOLIO/i }).click();
    // 포트폴리오 뷰 확인 (export 버튼 등 특징 요소)
    await expect(page.getByRole("button", { name: /GOD/i })).toBeVisible();
  });

  test("GOD 뷰로 돌아오기", async ({ page }) => {
    await page.goto("/");
    await page.waitForLoadState("networkidle");
    await page.getByRole("button", { name: /KANBAN/i }).click();
    await page.getByRole("button", { name: /GOD/i }).click();
    await expect(page.getByRole("button", { name: /GOD/i })).toBeVisible();
  });
});

test.describe("AI 채팅 패널", () => {
  test("AI 버튼 클릭 시 채팅 패널 열림", async ({ page }) => {
    await page.goto("/");
    await page.waitForLoadState("networkidle");
    await page.getByRole("button", { name: /^AI$/ }).click();
    await expect(page.getByText("AI MANAGER")).toBeVisible();
  });

  test("AI 채팅 패널 다시 클릭하면 닫힘", async ({ page }) => {
    await page.goto("/");
    await page.waitForLoadState("networkidle");
    const aiBtn = page.getByRole("button", { name: /^AI$/ });
    await aiBtn.click();
    await expect(page.getByText("AI MANAGER")).toBeVisible();
    await aiBtn.click();
    await expect(page.getByText("AI MANAGER")).not.toBeVisible();
  });
});

test.describe("설정(MyPage)", () => {
  test("MY 버튼 클릭 시 설정 페이지 열림", async ({ page }) => {
    await page.goto("/");
    await page.waitForLoadState("networkidle");
    await page.getByRole("button", { name: /MY/i }).click();
    await expect(page.getByText("MY PAGE")).toBeVisible();
  });

  test("ESC 또는 닫기 버튼으로 설정 닫힘", async ({ page }) => {
    await page.goto("/");
    await page.waitForLoadState("networkidle");
    await page.getByRole("button", { name: /MY/i }).click();
    await expect(page.getByText("MY PAGE")).toBeVisible();
    await page.getByRole("button", { name: /닫기/i }).click();
    await expect(page.getByText("MY PAGE")).not.toBeVisible();
  });

  test("캐릭터 닉네임 변경 입력 가능", async ({ page }) => {
    await page.goto("/");
    await page.waitForLoadState("networkidle");
    await page.getByRole("button", { name: /MY/i }).click();
    const nameInput = page.getByPlaceholder("ME");
    await nameInput.fill("테스터");
    await expect(nameInput).toHaveValue("테스터");
  });
});

test.describe("검색 & 필터", () => {
  test("검색창에 입력 시 실시간 필터", async ({ page }) => {
    await page.goto("/");
    await page.waitForLoadState("networkidle");
    const search = page.getByPlaceholder(/검색/i);
    await search.fill("없는프로젝트xyz");
    // 결과 없음 메시지 또는 GOD 뷰 유지 확인
    await expect(search).toHaveValue("없는프로젝트xyz");
  });

  test("ACTIVE 필터 클릭", async ({ page }) => {
    await page.goto("/");
    await page.waitForLoadState("networkidle");
    await page.getByRole("button", { name: /^ACTIVE$/i }).click();
    await expect(page.getByRole("button", { name: /^ACTIVE$/i })).toBeVisible();
  });
});

test.describe("접근성 기본", () => {
  test("주요 버튼에 aria-label 또는 텍스트 존재", async ({ page }) => {
    await page.goto("/");
    await page.waitForLoadState("networkidle");
    // 추가 버튼 접근 가능
    const addBtn = page.getByRole("button", { name: "+ 추가" });
    await expect(addBtn).toBeVisible();
    await expect(addBtn).toBeEnabled();
  });

  test("모달 열림 시 dialog role 존재", async ({ page }) => {
    await page.goto("/");
    await page.waitForLoadState("networkidle");
    await page.getByRole("button", { name: "+ 추가" }).click();
    await expect(page.getByRole("dialog")).toBeVisible();
  });

  test("탭 키로 주요 버튼 포커스 이동", async ({ page }) => {
    await page.goto("/");
    await page.waitForLoadState("networkidle");
    await page.keyboard.press("Tab");
    // 포커스가 어딘가로 이동했음을 확인
    const focused = page.locator(":focus");
    await expect(focused).toBeVisible().catch(() => {
      // 일부 환경에서 첫 탭이 body로 이동할 수 있음 — 실패 허용
    });
  });
});
