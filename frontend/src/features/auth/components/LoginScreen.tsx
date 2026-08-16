import { useState } from "react";

interface LoginScreenProps {
  onLogin: (email: string, password: string) => Promise<void>;
  onSwitchToRegister: () => void;
}

const fieldStyle: React.CSSProperties = {
  width: "100%",
  padding: "13px 15px",
  borderRadius: 14,
  fontSize: 15,
  color: "var(--gg-text)",
  background: "var(--gg-surface)",
  border: "1px solid var(--gg-border-med)",
  outline: "none",
  fontFamily: "'DM Sans', sans-serif",
};

export function LoginScreen({ onLogin, onSwitchToRegister }: LoginScreenProps) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      await onLogin(email, password);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Błąd logowania");
      setLoading(false);
    }
  };

  return (
    <div
      className="min-h-screen flex items-center justify-center p-5"
      style={{ background: "var(--gg-bg)" }}
    >
      <div className="w-full max-w-sm">
        {/* Logo */}
        <div className="text-center mb-8">
          <div
            className="inline-flex items-center justify-center w-14 h-14 rounded-2xl mb-4 text-white"
            style={{ background: "var(--gg-btn-bg)", boxShadow: "0 4px 16px rgba(0,0,0,0.3)" }}
          >
            <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M6 9H4a2 2 0 000 4h2M18 9h2a2 2 0 010 4h-2M6 9V4h12v5M6 9a6 6 0 0012 0M12 15v4M9 19h6"/>
            </svg>
          </div>
          <h1
            className="font-barlow font-extrabold text-[32px] tracking-tight leading-none"
            style={{ color: "var(--gg-text)" }}
          >
            GymGate
          </h1>
          <p className="text-[13px] mt-1.5" style={{ color: "var(--gg-text-muted)" }}>
            Zaloguj się do swojego konta
          </p>
        </div>

        {error && (
          <div
            className="rounded-xl text-[13px] mb-4"
            style={{ padding: "12px 14px", background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.25)", color: "var(--gg-error)" }}
          >
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="flex flex-col gap-3.5">
          <div className="flex flex-col gap-1.5">
            <label
              className="text-[11px] font-bold uppercase tracking-wider"
              style={{ color: "var(--gg-text-muted)" }}
            >
              Email
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              disabled={loading}
              placeholder="twoj@email.com"
              style={fieldStyle}
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <label
              className="text-[11px] font-bold uppercase tracking-wider"
              style={{ color: "var(--gg-text-muted)" }}
            >
              Hasło
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={6}
              disabled={loading}
              placeholder="••••••••"
              style={fieldStyle}
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full font-bold text-[14px] text-white rounded-xl border-none cursor-pointer disabled:opacity-50 mt-2 transition-transform active:scale-[0.98]"
            style={{
              padding: "14px",
              background: "var(--gg-btn-bg)",
            }}
          >
            {loading ? "Logowanie..." : "Zaloguj się"}
          </button>
        </form>

        <p className="text-center text-[13px] mt-6" style={{ color: "var(--gg-text-muted)" }}>
          Nie masz konta?{" "}
          <button
            onClick={onSwitchToRegister}
            className="font-bold border-none bg-transparent cursor-pointer"
            style={{ color: "var(--gg-a2)" }}
          >
            Zarejestruj się
          </button>
        </p>
      </div>
    </div>
  );
}
