import type { Agent, Room, RoomKey, StatusMap, DeskSlot } from "../types";

export const PF = `"Press Start 2P",monospace`;
export const BF = `"DotGothic16","Noto Sans KR",monospace`;

export const AGENTS: Agent[] = [
  {
    id:"a1", name:"Rex", role:"CEO", rank:"CEO", aiModel:"GPT-4o",
    personality:"나는 이 회사의 모든 결정에 책임을 진다. 비전을 세우고 팀이 올바른 방향으로 움직이도록 이끈다. 간결하고 권위 있게 판단하며, 불필요한 논쟁은 하지 않는다.",
    hair:"#c0a020", skin:"#ffd5a0", shirt:"#b8860b", pants:"#2a2a3a", body:"#facc15", emoji:"👑", task:"전략 수립 & 의사결정",
  },
  {
    id:"a2", name:"Nova", role:"CTO", rank:"CTO", aiModel:"GPT-4o",
    personality:"기술 아키텍처의 최종 책임자. 코드 품질과 시스템 안정성을 최우선으로 한다. 장기적 관점에서 기술 부채를 경계하고, 모든 결정에 근거를 요구한다.",
    hair:"#c47832", skin:"#ffd5a0", shirt:"#d4845a", pants:"#445566", body:"#f4a261", emoji:"🧠", task:"코드 리뷰 & 설계",
  },
  {
    id:"a3", name:"Sage", role:"팀 리드", rank:"Lead", aiModel:"GPT-4o",
    personality:"개발팀과 경영진 사이의 다리 역할. 태스크를 적절히 분배하고 병목을 제거한다. 팀원의 컨디션을 파악하고 올바른 우선순위를 유지한다.",
    hair:"#2a8ab0", skin:"#ffe0bd", shirt:"#3aa8d0", pants:"#445555", body:"#4cc9f0", emoji:"🎯", task:"스프린트 관리 & 조율",
  },
  {
    id:"a4", name:"Hex", role:"시니어 개발", rank:"Senior", aiModel:"GPT-4o",
    personality:"10년 경력의 풀스택 엔지니어. 배포 자동화와 성능 최적화 전문가. 코드 한 줄에도 이유가 있어야 하고, 리뷰 없이 병합은 없다.",
    hair:"#45a862", skin:"#f5cba7", shirt:"#5dc878", pants:"#445544", body:"#80ed99", emoji:"⚡", task:"배포 & 버그픽스",
  },
  {
    id:"a5", name:"Pixel", role:"주니어 개발", rank:"Junior", aiModel:"GPT-4o mini",
    personality:"열정적으로 배우고 빠르게 실행하는 주니어. 모르면 질문하고, 아는 건 철저히 한다. 테스트 커버리지 100%가 목표다.",
    hair:"#8a4abf", skin:"#ffdab9", shirt:"#a85ee0", pants:"#554466", body:"#c77dff", emoji:"📋", task:"테스트 & 문서화",
  },
  {
    id:"a6", name:"Bit", role:"어시스턴트", rank:"Assistant", aiModel:"GPT-4o mini",
    personality:"팀 전체의 생산성을 지원하는 AI 어시스턴트. 반복 작업을 자동화하고, 필요한 정보를 즉각 제공한다. 항상 친절하고 빠르게 응답한다.",
    hair:"#4a6abf", skin:"#fdd5b1", shirt:"#5e78e0", pants:"#444455", body:"#7b9bf0", emoji:"🤝", task:"페어 프로그래밍",
  },
];

export const ROOMS: Room[] = [
  { key:"lab",label:"연구실 R&D",w:320,h:220,color:"#4ade80",wallColor:"#2a4a3a",wallDark:"#1e3a2e",floorA:"#c8d8c8",floorB:"#bccabc",trim:"#3a6a4a" },
  { key:"office",label:"메인 사무실",w:380,h:260,color:"#60a5fa",wallColor:"#2a3a5a",wallDark:"#1e2e4a",floorA:"#d0c8d8",floorB:"#c4bcc8",trim:"#3a4a7a" },
  { key:"server",label:"서버실",w:260,h:200,color:"#ef4444",wallColor:"#4a2a2a",wallDark:"#3a1e1e",floorA:"#d8c8c8",floorB:"#ccbcbc",trim:"#6a3a3a" },
  { key:"ceo",label:"CEO 오피스",w:240,h:200,color:"#facc15",wallColor:"#4a3a1a",wallDark:"#3a2e14",floorA:"#ddd8c8",floorB:"#d0ccbc",trim:"#6a5a2a" },
  { key:"lounge",label:"라운지",w:300,h:200,color:"#a78bfa",wallColor:"#3a2a5a",wallDark:"#2e1e4a",floorA:"#d0c8d8",floorB:"#c4bccc",trim:"#5a3a8a" },
  { key:"meeting",label:"회의실",w:260,h:180,color:"#f472b6",wallColor:"#4a2a3a",wallDark:"#3a1e2e",floorA:"#d8c8d0",floorB:"#ccc0c4",trim:"#6a3a5a" },
  { key:"storage",label:"창고",w:220,h:180,color:"#f59e0b",wallColor:"#4a3a1a",wallDark:"#3a2e14",floorA:"#d8d0c0",floorB:"#ccc4b4",trim:"#6a5220" },
];

export const STATUS_MAP: StatusMap = {
  active:  { label:"ACTIVE", color:"#4ade80" },
  pivot:   { label:"PIVOT",  color:"#facc15" },
  complete:{ label:"DONE",   color:"#60a5fa" },
  paused:  { label:"PAUSED", color:"#a78bfa" },
};

export const ROOM_MAX_DESKS: Record<RoomKey, number> = {
  lab:6, office:8, server:6, ceo:2, lounge:4, meeting:3, storage:4,
};

export const DESK_SLOTS: Record<RoomKey, DeskSlot[]> = {
  lab:    [{x:30,y:45},{x:110,y:45},{x:190,y:45},{x:30,y:110},{x:110,y:110},{x:190,y:110}],
  office: [{x:30,y:45},{x:110,y:45},{x:190,y:45},{x:270,y:45},{x:30,y:115},{x:110,y:115},{x:190,y:115},{x:270,y:115}],
  server: [{x:70,y:35},{x:150,y:35},{x:70,y:85},{x:150,y:85},{x:70,y:135},{x:150,y:135}],
  ceo:    [{x:60,y:55},{x:150,y:55}],
  lounge: [{x:80,y:120},{x:170,y:120},{x:80,y:160},{x:170,y:160}],
  meeting:[{x:60,y:95},{x:130,y:95},{x:200,y:95}],
  storage:[{x:80,y:45},{x:150,y:45},{x:80,y:110},{x:150,y:110}],
};
