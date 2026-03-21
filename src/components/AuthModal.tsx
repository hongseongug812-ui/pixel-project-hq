import { useState } from "react";
import { PF, BF } from "../data/constants";
import { useAuth } from "../contexts/AuthContext";

interface AuthModalProps {
  onMigrate?: () => void;
  onDemo?: () => void;
}

export default function AuthModal({ onMigrate, onDemo }: AuthModalProps) {
  const { signIn, signUp } = useAuth();
  const [tab, setTab]         = useState<"signin" | "signup">("signin");
  const [email, setEmail]     = useState("");
  const [pw, setPw]           = useState("");
  const [pw2, setPw2]         = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState("");
  const [done, setDone]       = useState("");

  const inp: React.CSSProperties = {
    width: "100%", fontFamily: BF, fontSize: 12, color: "#ccc",
    background: "#080810", border: "1px solid #1e1e2e",
    padding: "6px 8px", outline: "none", boxSizing: "border-box",
  };

  const submit = async () => {
    setError(""); setDone("");
    if (!email || !pw) { setError("이메일과 비밀번호를 입력하세요."); return; }

    if (tab === "signup") {
      if (pw !== pw2) { setError("비밀번호가 일치하지 않습니다."); return; }
      if (pw.length < 6) { setError("비밀번호는 6자 이상이어야 합니다."); return; }
    }

    setLoading(true);
    try {
      if (tab === "signup") {
        const { error: e } = await signUp(email, pw);
        if (e) throw e;
        setDone("가입 확인 이메일을 전송했습니다. 확인 후 로그인해주세요.");
        setTab("signin");
      } else {
        const { error: e } = await signIn(email, pw);
        if (e) throw e;
        onMigrate?.();
      }
    } catch (e) {
      const msg = (e as Error).message || "오류가 발생했습니다.";
      if (msg.includes("Invalid login") || msg.includes("invalid_credentials")) setError("이메일 또는 비밀번호가 올바르지 않습니다.");
      else if (msg.includes("Email not confirmed") || msg.includes("email_not_confirmed")) setError("이메일 인증 필요 — 받은편지함을 확인하거나, Supabase 대시보드 → Auth → Providers → Email → Confirm email OFF");
      else if (msg.includes("already registered") || msg.includes("User already registered")) setError("이미 가입된 이메일입니다.");
      else setError(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{
      position: "fixed", inset: 0, background: "#0d0d12",
      display: "flex", alignItems: "center", justifyContent: "center", zIndex: 2000,
    }}>
      <div style={{ width: 320, display: "flex", flexDirection: "column", gap: 0 }}>
        <div style={{ textAlign: "center", marginBottom: 32 }}>
          <div style={{ fontFamily: PF, fontSize: 14, color: "#facc15", letterSpacing: 3, textShadow: "0 0 20px #facc1566", marginBottom: 6 }}>
            <span style={{ color: "#ef4444" }}>⬤</span> PIXEL HQ
          </div>
          <div style={{ fontFamily: PF, fontSize: 5, color: "#333", letterSpacing: 2 }}>PROJECT MANAGEMENT SYSTEM</div>
        </div>

        <div style={{ display: "flex", marginBottom: 0, border: "1px solid #1a1a28" }}>
          {([["signin", "로그인"], ["signup", "회원가입"]] as const).map(([v, l]) => (
            <button key={v} onClick={() => { setTab(v); setError(""); setDone(""); }} style={{
              all: "unset", cursor: "pointer", flex: 1, textAlign: "center",
              fontFamily: BF, fontSize: 14, fontWeight: "bold", padding: "8px 0",
              color: tab === v ? "#000" : "#444",
              background: tab === v ? "#facc15" : "#0e0e16",
            }}>{l}</button>
          ))}
        </div>

        <div style={{ background: "#0e0e16", border: "1px solid #1a1a28", borderTop: "none", padding: 20, display: "flex", flexDirection: "column", gap: 10 }}>
          <div>
            <div style={{ fontFamily: PF, fontSize: 5, color: "#555", marginBottom: 3 }}>EMAIL</div>
            <input type="email" value={email} onChange={e => setEmail(e.target.value)}
              onKeyDown={e => e.key === "Enter" && submit()}
              placeholder="you@example.com" style={inp} autoFocus />
          </div>

          <div>
            <div style={{ fontFamily: PF, fontSize: 5, color: "#555", marginBottom: 3 }}>PASSWORD</div>
            <input type="password" value={pw} onChange={e => setPw(e.target.value)}
              onKeyDown={e => e.key === "Enter" && submit()}
              placeholder="••••••••" style={inp} />
          </div>

          {tab === "signup" && (
            <div>
              <div style={{ fontFamily: PF, fontSize: 5, color: "#555", marginBottom: 3 }}>CONFIRM PASSWORD</div>
              <input type="password" value={pw2} onChange={e => setPw2(e.target.value)}
                onKeyDown={e => e.key === "Enter" && submit()}
                placeholder="••••••••" style={inp} />
            </div>
          )}

          {error && (
            <div style={{ fontFamily: BF, fontSize: 10, color: "#ef4444", background: "#1a0808", border: "1px solid #ef444422", padding: "5px 8px" }}>
              {error}
            </div>
          )}
          {done && (
            <div style={{ fontFamily: BF, fontSize: 10, color: "#4ade80", background: "#081208", border: "1px solid #4ade8022", padding: "5px 8px" }}>
              {done}
            </div>
          )}

          <button onClick={submit} disabled={loading} style={{
            all: "unset", cursor: loading ? "default" : "pointer",
            fontFamily: BF, fontSize: 15, fontWeight: "bold", color: "#000",
            background: loading ? "#2a6a40" : "#4ade80",
            padding: "9px 0", textAlign: "center", marginTop: 4,
            opacity: loading ? 0.7 : 1,
          }}>
            {loading ? "처리 중..." : tab === "signin" ? "로그인" : "가입하기"}
          </button>
        </div>

        <button onClick={onDemo} style={{
          all: "unset", cursor: "pointer", width: "100%", boxSizing: "border-box",
          fontFamily: BF, fontSize: 13, fontWeight: "bold", color: "#facc15",
          background: "#0e0e16", border: "1px solid #facc1533",
          padding: "9px 0", textAlign: "center", marginTop: 8,
        }}>
          ▶ 데모 체험하기 (로그인 없이)
        </button>

        <div style={{ fontFamily: PF, fontSize: 4, color: "#2a2a38", textAlign: "center", marginTop: 12 }}>
          PIXEL HQ v2 · Powered by Supabase
        </div>
      </div>
    </div>
  );
}
