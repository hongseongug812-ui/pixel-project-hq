import { useState, useRef, useEffect } from "react";
import { PF, BF } from "../data/constants";
import type { FeedMessage, FeedChannel } from "../hooks/useCompanyFeed";

const CHANNEL_META: Record<FeedChannel, { label: string; icon: string; color: string }> = {
  announcements: { label: "공지사항", icon: "📢", color: "#facc15" },
  general:       { label: "일반",     icon: "💬", color: "#60a5fa" },
  dev:           { label: "개발",     icon: "💻", color: "#4ade80" },
  ops:           { label: "운영",     icon: "⚙",  color: "#a78bfa" },
};

function formatTime(ts: number) {
  const d = new Date(ts);
  return `${d.getHours().toString().padStart(2, "0")}:${d.getMinutes().toString().padStart(2, "0")}`;
}

function formatDate(ts: number) {
  const d = new Date(ts);
  const today = new Date();
  if (d.toDateString() === today.toDateString()) return "오늘";
  const yesterday = new Date(today);
  yesterday.setDate(today.getDate() - 1);
  if (d.toDateString() === yesterday.toDateString()) return "어제";
  return `${d.getMonth() + 1}/${d.getDate()}`;
}

interface Props {
  messages: FeedMessage[];
  onPostAsMe: (content: string, channel: FeedChannel) => void;
  onPostAnnouncement: (content: string) => void;
  onClear: () => void;
}

export default function CompanyFeed({ messages, onPostAsMe, onPostAnnouncement, onClear }: Props) {
  const [activeChannel, setActiveChannel] = useState<FeedChannel>("general");
  const [input, setInput] = useState("");
  const [announceMode, setAnnounceMode] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  const filtered = messages.filter(m => m.channel === activeChannel);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [filtered.length]);

  function send() {
    const text = input.trim();
    if (!text) return;
    if (announceMode) {
      onPostAnnouncement(text);
      setActiveChannel("announcements");
    } else {
      onPostAsMe(text, activeChannel);
    }
    setInput("");
    setAnnounceMode(false);
  }

  // Group messages by date
  const grouped: { date: string; msgs: FeedMessage[] }[] = [];
  filtered.forEach(msg => {
    const date = formatDate(msg.timestamp);
    const last = grouped[grouped.length - 1];
    if (last && last.date === date) last.msgs.push(msg);
    else grouped.push({ date, msgs: [msg] });
  });

  return (
    <div style={{ display: "flex", width: "100%", height: "calc(100vh - 82px)" }}>
      {/* Sidebar: channels */}
      <div style={{
        width: 160, flexShrink: 0, background: "#080810", borderRight: "1px solid #1a1a28",
        display: "flex", flexDirection: "column",
      }}>
        <div style={{ padding: "10px 10px 6px", borderBottom: "1px solid #1a1a28" }}>
          <div style={{ fontFamily: PF, fontSize: 6, color: "#facc15", letterSpacing: 1 }}>🏢 PIXEL HQ</div>
          <div style={{ fontFamily: BF, fontSize: 11, color: "#333", marginTop: 2 }}>사내 채팅</div>
        </div>

        <div style={{ padding: "8px 6px 4px" }}>
          <div style={{ fontFamily: PF, fontSize: 4, color: "#333", marginBottom: 4, paddingLeft: 4 }}>채널</div>
          {(Object.keys(CHANNEL_META) as FeedChannel[]).map(ch => {
            const meta = CHANNEL_META[ch];
            const unread = ch !== activeChannel ? messages.filter(m => m.channel === ch).length : 0;
            const hasUnread = unread > 0;
            return (
              <button
                key={ch}
                onClick={() => setActiveChannel(ch)}
                style={{
                  all: "unset", display: "flex", alignItems: "center", gap: 5,
                  width: "100%", padding: "5px 8px", cursor: "pointer", borderRadius: 2,
                  background: activeChannel === ch ? `${meta.color}18` : "transparent",
                  borderLeft: `2px solid ${activeChannel === ch ? meta.color : "transparent"}`,
                  marginBottom: 1,
                }}
              >
                <span style={{ fontSize: 10 }}>{meta.icon}</span>
                <span style={{ fontFamily: BF, fontSize: 12, color: activeChannel === ch ? meta.color : "#555", flex: 1 }}>
                  # {meta.label}
                </span>
                {hasUnread && (
                  <span style={{ fontFamily: PF, fontSize: 4, color: "#000", background: meta.color, borderRadius: 99, padding: "1px 4px" }}>
                    {Math.min(unread, 99)}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        <div style={{ flex: 1 }} />

        <div style={{ padding: 8, borderTop: "1px solid #1a1a28" }}>
          <button
            onClick={onClear}
            style={{ all: "unset", cursor: "pointer", fontFamily: PF, fontSize: 4, color: "#333", border: "1px solid #1e1e28", padding: "3px 6px", width: "100%", textAlign: "center", boxSizing: "border-box" }}
          >
            CLR
          </button>
        </div>
      </div>

      {/* Main: messages */}
      <div style={{ flex: 1, display: "flex", flexDirection: "column", background: "#0a0a12", minWidth: 0 }}>
        {/* Channel header */}
        <div style={{ padding: "8px 14px", borderBottom: "1px solid #1a1a28", display: "flex", alignItems: "center", gap: 8 }}>
          <span style={{ fontSize: 14 }}>{CHANNEL_META[activeChannel].icon}</span>
          <span style={{ fontFamily: PF, fontSize: 6, color: CHANNEL_META[activeChannel].color }}>
            # {CHANNEL_META[activeChannel].label}
          </span>
          <span style={{ fontFamily: BF, fontSize: 11, color: "#2a2a38", marginLeft: 4 }}>
            {filtered.length}개 메시지
          </span>
        </div>

        {/* Messages */}
        <div style={{ flex: 1, overflowY: "auto", padding: "10px 14px", display: "flex", flexDirection: "column", gap: 0 }}>
          {filtered.length === 0 && (
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", height: "100%", gap: 8 }}>
              <div style={{ fontSize: 28, opacity: 0.3 }}>{CHANNEL_META[activeChannel].icon}</div>
              <div style={{ fontFamily: BF, fontSize: 13, color: "#2a2a38" }}>아직 메시지가 없습니다</div>
            </div>
          )}
          {grouped.map(({ date, msgs }) => (
            <div key={date}>
              {/* Date divider */}
              <div style={{ display: "flex", alignItems: "center", gap: 8, margin: "12px 0 10px", opacity: 0.5 }}>
                <div style={{ flex: 1, height: 1, background: "#1a1a28" }} />
                <span style={{ fontFamily: PF, fontSize: 4, color: "#444", flexShrink: 0 }}>{date}</span>
                <div style={{ flex: 1, height: 1, background: "#1a1a28" }} />
              </div>

              {msgs.map((m, i) => {
                const prev = i > 0 ? msgs[i - 1] : null;
                const sameAuthor = prev?.agentId === m.agentId && (m.timestamp - (prev?.timestamp ?? 0)) < 5 * 60 * 1000;
                const isAnnouncement = m.type === "announcement";

                return (
                  <div
                    key={m.id}
                    style={{
                      display: "flex", gap: 8, padding: sameAuthor ? "1px 0" : "6px 0 1px",
                      background: isAnnouncement ? "#1a160a" : "transparent",
                      borderLeft: isAnnouncement ? "2px solid #facc1544" : "none",
                      paddingLeft: isAnnouncement ? 8 : 0,
                      marginLeft: isAnnouncement ? -8 : 0,
                    }}
                  >
                    {/* Avatar */}
                    <div style={{ width: 28, flexShrink: 0 }}>
                      {!sameAuthor && (
                        <div style={{
                          width: 28, height: 28, borderRadius: "50%",
                          background: m.agentColor, display: "flex", alignItems: "center",
                          justifyContent: "center", fontSize: 14,
                        }}>
                          {m.agentEmoji}
                        </div>
                      )}
                    </div>

                    {/* Content */}
                    <div style={{ flex: 1, minWidth: 0 }}>
                      {!sameAuthor && (
                        <div style={{ display: "flex", alignItems: "baseline", gap: 6, marginBottom: 2 }}>
                          <span style={{ fontFamily: PF, fontSize: 5, color: m.agentColor }}>{m.agentName}</span>
                          {m.agentId === "me" && (
                            <span style={{ fontFamily: PF, fontSize: 3, color: "#555", background: "#1a1a28", padding: "1px 4px" }}>나</span>
                          )}
                          <span style={{ fontFamily: BF, fontSize: 10, color: "#333" }}>{formatTime(m.timestamp)}</span>
                        </div>
                      )}
                      <div style={{
                        fontFamily: BF, fontSize: 13, color: isAnnouncement ? "#e8d88a" : "#999",
                        lineHeight: 1.6, whiteSpace: "pre-wrap", wordBreak: "break-word",
                      }}>
                        {m.content}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          ))}
          <div ref={bottomRef} />
        </div>

        {/* Input */}
        <div style={{ padding: "8px 14px", borderTop: "1px solid #1a1a28" }}>
          {announceMode && (
            <div style={{ fontFamily: PF, fontSize: 4, color: "#facc15", marginBottom: 4 }}>
              📢 CEO 전사 공지 모드 — ESC로 취소
            </div>
          )}
          <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
            <button
              onClick={() => setAnnounceMode(m => !m)}
              title="CEO 전사 공지"
              style={{
                all: "unset", cursor: "pointer", fontSize: 16, opacity: announceMode ? 1 : 0.4,
                flexShrink: 0, lineHeight: 1,
              }}
            >
              📢
            </button>
            <input
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={e => {
                if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(); }
                if (e.key === "Escape") { setAnnounceMode(false); setInput(""); }
              }}
              placeholder={
                announceMode
                  ? "CEO 공지 내용 입력..."
                  : `# ${CHANNEL_META[activeChannel].label}에 메시지 보내기`
              }
              style={{
                flex: 1, fontFamily: BF, fontSize: 13, color: "#bbb",
                background: announceMode ? "#1a140a" : "#111118",
                border: `1px solid ${announceMode ? "#facc1544" : "#1e1e28"}`,
                padding: "7px 10px", outline: "none",
              }}
            />
            <button
              onClick={send}
              disabled={!input.trim()}
              style={{
                all: "unset", cursor: "pointer", fontFamily: PF, fontSize: 5,
                color: "#000",
                background: !input.trim() ? "#1a1a28" : announceMode ? "#facc15" : CHANNEL_META[activeChannel].color,
                padding: "6px 10px", opacity: !input.trim() ? 0.4 : 1,
              }}
            >
              ↑
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
