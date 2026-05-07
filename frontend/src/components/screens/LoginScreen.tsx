import { useState } from "react";

interface LoginScreenProps {
  onLogin: (email: string, password: string) => Promise<void>;
  onSwitchToRegister: () => void;
}

const fieldStyle: React.CSSProperties = {
  width: "100%",
  padding: "14px 16px",
  borderRadius: 14,
  fontSize: 15,
  color: "var(--gg-text)",
  background: "var(--gg-surface2)",
  border: "1.5px solid var(--gg-border)",
  outline: "none",
  fontFamily: "'DM Sans', sans-serif",
}

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
        <div className="text-center mb-10">
          <div
            className="inline-flex items-center justify-center w-16 h-16 rounded-[20px] mb-5"
            style={{ background: "var(--gg-grad-btn)", boxShadow: "0 8px 32px var(--gg-glow)" }}
          >
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M6 9H4a2 2 0 000 4h2M18 9h2a2 2 0 010 4h-2M6 9V4h12v5M6 9a6 6 0 0012 0M12 15v4M9 19h6"/>
            </svg>
          </div>
          <h1
            className="font-barlow font-black"
            style={{ fontSize: 36, letterSpacing: "-0.03em", color: "var(--gg-text)" }}
          >
            GymGate
          </h1>
          <p className="text-[13px] mt-1" style={{ color: "var(--gg-text-muted)" }}>
            Zaloguj się do swojego konta
          </p>
        </div>

        {error && (
          <div
            className="rounded-[12px] text-[13px] mb-5"
            style={{ padding: "12px 14px", background: "rgba(239,68,68,0.08)", border: "1.5px solid rgba(239,68,68,0.25)", color: "var(--gg-error)" }}
          >
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <label
              className="text-[12px] font-bold uppercase tracking-[0.06em]"
              style={{ color: "var(--gg-text-sub)" }}
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
              className="text-[12px] font-bold uppercase tracking-[0.06em]"
              style={{ color: "var(--gg-text-sub)" }}
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
            className="w-full font-bold text-[15px] text-white rounded-[15px] border-none cursor-pointer disabled:opacity-50 mt-2"
            style={{
              padding: 16,
              background: "var(--gg-grad-btn)",
              boxShadow: "0 4px 24px var(--gg-glow)",
            }}
          >
            {loading ? "Logowanie..." : "Zaloguj się"}
          </button>
        </form>

        <p className="text-center text-[13px] mt-6" style={{ color: "var(--gg-text-muted)" }}>
          Nie masz konta?{" "}
          <button
            onClick={onSwitchToRegister}
            className="font-semibold border-none bg-transparent cursor-pointer"
            style={{ color: "var(--gg-a1)" }}
          >
            Zarejestruj się
          </button>
        </p>
      </div>
    </div>
  );
}
