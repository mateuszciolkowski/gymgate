import { useState } from "react";

interface RegisterScreenProps {
  onRegister: (data: {
    email: string;
    password: string;
    firstName: string;
    lastName: string;
    phone?: string;
  }) => Promise<void>;
  onSwitchToLogin: () => void;
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

export function RegisterScreen({ onRegister, onSwitchToLogin }: RegisterScreenProps) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [phone, setPhone] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (password !== confirmPassword) {
      setError("Hasła nie są identyczne");
      return;
    }
    if (password.length < 6) {
      setError("Hasło musi mieć minimum 6 znaków");
      return;
    }

    setLoading(true);
    try {
      await onRegister({ email, password, firstName, lastName, phone: phone || undefined });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Błąd rejestracji");
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
            Stwórz nowe konto
          </p>
        </div>

        {error && (
          <div
            className="rounded-[12px] text-[13px] mb-4"
            style={{ padding: "12px 14px", background: "rgba(239,68,68,0.08)", border: "1.5px solid rgba(239,68,68,0.25)", color: "var(--gg-error)" }}
          >
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="flex flex-col gap-3.5">
          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1.5">
              <label className="text-[12px] font-bold uppercase tracking-[0.06em]" style={{ color: "var(--gg-text-sub)" }}>
                Imię
              </label>
              <input
                type="text"
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                required
                placeholder="Jan"
                style={fieldStyle}
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-[12px] font-bold uppercase tracking-[0.06em]" style={{ color: "var(--gg-text-sub)" }}>
                Nazwisko
              </label>
              <input
                type="text"
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
                required
                placeholder="Kowalski"
                style={fieldStyle}
              />
            </div>
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-[12px] font-bold uppercase tracking-[0.06em]" style={{ color: "var(--gg-text-sub)" }}>
              Email
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              placeholder="twoj@email.com"
              style={fieldStyle}
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-[12px] font-bold uppercase tracking-[0.06em]" style={{ color: "var(--gg-text-sub)" }}>
              Telefon{" "}
              <span style={{ color: "var(--gg-text-muted)", textTransform: "none", fontWeight: 400 }}>(opcjonalny)</span>
            </label>
            <input
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="+48 123 456 789"
              style={fieldStyle}
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-[12px] font-bold uppercase tracking-[0.06em]" style={{ color: "var(--gg-text-sub)" }}>
              Hasło
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={6}
              placeholder="••••••••"
              style={fieldStyle}
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-[12px] font-bold uppercase tracking-[0.06em]" style={{ color: "var(--gg-text-sub)" }}>
              Potwierdź hasło
            </label>
            <input
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              required
              minLength={6}
              placeholder="••••••••"
              style={fieldStyle}
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full font-bold text-[15px] text-white rounded-[15px] border-none cursor-pointer disabled:opacity-50 mt-1"
            style={{
              padding: 16,
              background: "var(--gg-grad-btn)",
              boxShadow: "0 4px 24px var(--gg-glow)",
            }}
          >
            {loading ? "Rejestracja..." : "Zarejestruj się"}
          </button>
        </form>

        <p className="text-center text-[13px] mt-5" style={{ color: "var(--gg-text-muted)" }}>
          Masz już konto?{" "}
          <button
            onClick={onSwitchToLogin}
            className="font-semibold border-none bg-transparent cursor-pointer"
            style={{ color: "var(--gg-a1)" }}
          >
            Zaloguj się
          </button>
        </p>
      </div>
    </div>
  );
}
