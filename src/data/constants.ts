import type { Agent, Room, RoomKey, StatusMap, DeskSlot } from "../types";

export const PF = `"Press Start 2P",monospace`;
export const BF = `"DotGothic16","Noto Sans KR",monospace`;

export const AGENTS: Agent[] = [
  { id:"a1",name:"Claude",role:"CTO",hair:"#c47832",skin:"#ffd5a0",shirt:"#d4845a",pants:"#445566",body:"#f4a261",emoji:"🧠",task:"코드 리뷰 & 설계" },
  { id:"a2",name:"Gemini",role:"보안관",hair:"#2a8ab0",skin:"#ffe0bd",shirt:"#3aa8d0",pants:"#445555",body:"#4cc9f0",emoji:"🛡️",task:"보안 스캔" },
  { id:"a3",name:"Codex",role:"시니어 개발",hair:"#45a862",skin:"#f5cba7",shirt:"#5dc878",pants:"#445544",body:"#80ed99",emoji:"⚡",task:"배포 & 버그픽스" },
  { id:"a4",name:"Devin",role:"주니어",hair:"#8a4abf",skin:"#ffdab9",shirt:"#a85ee0",pants:"#554466",body:"#c77dff",emoji:"📋",task:"테스트 & 문서" },
  { id:"a5",name:"Cursor",role:"빌더",hair:"#bf8a4a",skin:"#ffe4c4",shirt:"#e0a85e",pants:"#554444",body:"#ffb347",emoji:"🔨",task:"프론트엔드 구현" },
  { id:"a6",name:"Copilot",role:"어시스턴트",hair:"#4a6abf",skin:"#fdd5b1",shirt:"#5e78e0",pants:"#444455",body:"#7b9bf0",emoji:"🤝",task:"페어 프로그래밍" },
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
