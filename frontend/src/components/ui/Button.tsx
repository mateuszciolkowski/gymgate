import { memo, type ButtonHTMLAttributes, type ReactNode } from "react";

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary" | "danger" | "ghost";
  size?: "sm" | "md" | "lg";
  loading?: boolean;
  loadingText?: string;
  icon?: ReactNode;
  fullWidth?: boolean;
  children: ReactNode;
}

export const Button = memo(function Button({
  variant = "primary",
  size = "md",
  loading = false,
  loadingText,
  icon,
  fullWidth = false,
  disabled = false,
  className = "",
  style,
  children,
  ...props
}: ButtonProps) {
  const getPaddingAndFont = () => {
    switch (size) {
      case "sm":
        return { padding: "9px 16px", fontSize: 13, borderRadius: 12, minHeight: 38 };
      case "lg":
        return { padding: "15px 22px", fontSize: 15, borderRadius: 16, minHeight: 52 };
      case "md":
      default:
        return { padding: "12px 18px", fontSize: 14, borderRadius: 14, minHeight: 44 };
    }
  };

  const getVariantStyles = () => {
    switch (variant) {
      case "secondary":
        return {
          background: "var(--gg-surface2)",
          color: "var(--gg-text)",
          border: "1px solid var(--gg-border-med, var(--gg-border))",
          boxShadow: "0 1px 3px rgba(0, 0, 0, 0.2)",
        };
      case "danger":
        return {
          background: "rgba(239,68,68,0.12)",
          color: "var(--gg-error)",
          border: "1px solid rgba(239,68,68,0.3)",
          boxShadow: "none",
        };
      case "ghost":
        return {
          background: "transparent",
          color: "var(--gg-text-sub)",
          border: "none",
          boxShadow: "none",
        };
      case "primary":
      default:
        return {
          background: loading ? "var(--gg-surface3)" : "var(--gg-grad-btn)",
          color: "#ffffff",
          border: "1px solid rgba(255, 255, 255, 0.15)",
          boxShadow: loading ? "none" : "0 4px 22px var(--gg-glow, rgba(0,0,0,0.35))",
        };
    }
  };

  const sizeStyle = getPaddingAndFont();
  const variantStyle = getVariantStyles();

  return (
    <button
      disabled={disabled || loading}
      className={`font-bold flex items-center justify-center gap-2 cursor-pointer transition-all duration-150 active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed select-none ${
        fullWidth ? "w-full" : ""
      } ${className}`}
      style={{
        ...sizeStyle,
        ...variantStyle,
        ...style,
      }}
      {...props}
    >
      {loading ? (
        <>
          <div
            className="w-4 h-4 rounded-full border-2 border-t-transparent animate-spin"
            style={{ borderColor: "currentColor", borderTopColor: "transparent" }}
          />
          {loadingText ? <span>{loadingText}</span> : children}
        </>
      ) : (
        <>
          {icon && <span className="flex-shrink-0 flex items-center">{icon}</span>}
          <span>{children}</span>
        </>
      )}
    </button>
  );
});
