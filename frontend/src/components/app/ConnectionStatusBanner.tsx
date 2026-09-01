export function ConnectionStatusBanner() {
  return (
    <div
      className="px-4 py-2 flex items-center gap-2"
      style={{
        background: "var(--gg-active-bg)",
        borderBottom: "1px solid var(--gg-active-border)",
      }}
    >
      <span
        className="w-2 h-2 rounded-full shrink-0"
        style={{ background: "var(--gg-active-border)" }}
      />
      <p className="text-[11px] font-semibold" style={{ color: "var(--gg-active-border)" }}>
        Brak połączenia z internetem — pracujesz offline
      </p>
    </div>
  );
}
