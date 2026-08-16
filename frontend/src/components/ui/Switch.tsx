import { memo } from "react";

export interface SwitchProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
  disabled?: boolean;
  label?: string;
  description?: string;
  badge?: string;
  variant?: "accent" | "admin" | "default";
  icon?: React.ReactNode;
  className?: string;
}

export const Switch = memo(function Switch({
  checked,
  onChange,
  disabled = false,
  label,
  description,
  badge,
  variant = "accent",
  icon,
  className = "",
}: SwitchProps) {
  const getActiveBg = () => {
    if (variant === "admin") return "var(--gg-a2)";
    if (variant === "accent") return "var(--gg-a1)";
    return "var(--gg-btn-bg)";
  };

  const getContainerBorder = () => {
    if (!checked) return "1.5px solid var(--gg-border)";
    if (variant === "admin") return "1.5px solid var(--gg-a2)";
    return "1.5px solid var(--gg-a1)";
  };

  const getContainerBg = () => {
    if (!checked) return "var(--gg-surface2)";
    if (variant === "admin") return "color-mix(in srgb, var(--gg-a2) 6%, var(--gg-surface))";
    return "color-mix(in srgb, var(--gg-a1) 6%, var(--gg-surface))";
  };

  const switchButton = (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className="relative flex-shrink-0 rounded-full border-none cursor-pointer transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
      style={{
        width: 48,
        height: 28,
        background: checked ? getActiveBg() : "var(--gg-surface3)",
        padding: 2,
      }}
    >
      <span
        className="block rounded-full transition-all duration-200"
        style={{
          width: 24,
          height: 24,
          background: "white",
          transform: checked ? "translateX(20px)" : "translateX(0)",
          boxShadow: "0 1px 3px rgba(0,0,0,0.3)",
        }}
      />
    </button>
  );

  if (!label && !description) {
    return switchButton;
  }

  return (
    <div
      className={`flex items-center justify-between rounded-[14px] px-4 py-3.5 transition-all duration-200 ${className}`}
      style={{
        background: getContainerBg(),
        border: getContainerBorder(),
      }}
    >
      <div className="flex items-center gap-3 min-w-0 pr-3">
        {icon && (
          <div
            className="flex items-center justify-center flex-shrink-0 rounded-[10px]"
            style={{
              width: 36,
              height: 36,
              background: checked
                ? variant === "admin"
                  ? "color-mix(in srgb, var(--gg-a2) 15%, transparent)"
                  : "color-mix(in srgb, var(--gg-a1) 15%, transparent)"
                : "var(--gg-surface2)",
            }}
          >
            {icon}
          </div>
        )}
        <div className="min-w-0">
          <div className="flex items-center gap-1.5">
            <span className="text-[14px] font-bold truncate" style={{ color: "var(--gg-text)" }}>
              {label}
            </span>
            {badge && (
              <span
                className="text-[10px] font-extrabold uppercase px-1.5 py-0.5 rounded tracking-wider flex-shrink-0"
                style={{
                  background: variant === "admin" ? "var(--gg-a2)" : "var(--gg-a1)",
                  color: "#000",
                }}
              >
                {badge}
              </span>
            )}
          </div>
          {description && (
            <p className="text-[12px] m-0 mt-0.5 leading-snug" style={{ color: "var(--gg-text-muted)" }}>
              {description}
            </p>
          )}
        </div>
      </div>
      {switchButton}
    </div>
  );
});
