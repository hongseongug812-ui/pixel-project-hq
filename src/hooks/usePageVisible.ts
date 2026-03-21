import { useState, useEffect } from "react";

/**
 * 현재 탭이 사용자에게 보이는지 여부를 반환한다.
 * Page Visibility API 기반 — 탭이 백그라운드로 이동하면 false 반환.
 * 인터벌·애니메이션을 탭 숨김 시 중단하는 데 활용한다.
 */
export function usePageVisible(): boolean {
  const [visible, setVisible] = useState(!document.hidden);

  useEffect(() => {
    function onChange() { setVisible(!document.hidden); }
    document.addEventListener("visibilitychange", onChange);
    return () => document.removeEventListener("visibilitychange", onChange);
  }, []);

  return visible;
}
