import { useState, useEffect } from "react";
import { AGENTS, ROOMS } from "../data/constants";

const LOG_ACTIONS = [
  p => `${p.name} 코드 리뷰 완료`,
  p => `${p.name} 보안 스캔 ✓`,
  p => `${p.name} 의존성 업데이트 확인`,
  p => `${p.name} 테스트 실행 중...`,
  () => `서버 헬스체크 ✓`,
  p => `${p.name} 방치 상태 점검`,
  p => `${p.name} 성능 프로파일링`,
  p => `${p.name} 배포 파이프라인 확인`,
  p => `${p.name} 문서 자동 갱신`,
  p => `${p.name} 에러 로그 분석`,
  p => `${p.name} CI/CD 파이프라인 실행`,
  () => `서버 응답시간 정상`,
  p => `${p.name} 데이터베이스 백업 완료`,
];

export function useAgents(projects, pushLog) {
  const [agentState, setAgentState] = useState(() =>
    AGENTS.map((a, i) => ({
      ...a, room: ROOMS[i % ROOMS.length].key,
      x: 20 + Math.random() * 100, y: 50 + Math.random() * 80,
      frame: 0, dx: 0.3 + Math.random() * 0.5, currentTask: a.task,
    }))
  );
  const [tick, setTick] = useState(0);

  // 이동 루프
  useEffect(() => {
    const iv = setInterval(() => {
      setTick(t => t + 1);
      setAgentState(prev => prev.map(a => {
        const rm = ROOMS.find(r => r.key === a.room);
        const maxX = rm ? rm.w - 30 : 160;
        let nx = a.x + a.dx, nd = a.dx;
        if (nx > maxX || nx < 15) { nd = -nd; nx = a.x + nd; }
        return { ...a, x: nx, dx: nd, frame: a.frame + 1 };
      }));
    }, 180);
    return () => clearInterval(iv);
  }, []);

  // 에이전트 액션 (25틱마다)
  useEffect(() => {
    if (tick % 25 !== 0 || tick === 0) return;
    setAgentState(prev => {
      const c = [...prev];
      const i = Math.floor(Math.random() * c.length);
      const rm = ROOMS[Math.floor(Math.random() * ROOMS.length)];
      const action = LOG_ACTIONS[Math.floor(Math.random() * LOG_ACTIONS.length)];
      const proj = projects.length ? projects[Math.floor(Math.random() * projects.length)] : { name: "시스템" };
      c[i] = { ...c[i], room: rm.key, x: 20 + Math.random() * 80, y: 50 + Math.random() * 60, currentTask: action(proj).replace((proj.name || "") + " ", "") };
      pushLog(action(proj), c[i].emoji, c[i].body, c[i].name);
      return c;
    });
  }, [tick, projects, pushLog]);

  return { agentState, tick };
}
