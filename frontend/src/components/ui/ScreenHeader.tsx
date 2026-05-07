import { memo } from "react";

interface ScreenHeaderProps {
  title: string;
  subtitle?: string;
  label?: string;
  action?: React.ReactNode;
  actions?: React.ReactNode;
  onBack?: () => void;
  rightSlot?: React.ReactNode;
}

export const ScreenHeader = memo(function ScreenHeader({
  title,
  subtitle,
  label,
  action,
  actions,
  onBack,
  rightSlot,
}: ScreenHeaderProps) {
  return (
    <div className="flex items-start justify-between mb-5">
      <div className="flex items-center gap-3 flex-1">
        {onBack && (
          <button
            onClick={onBack}
            className="flex items-center justify-center w-[38px] h-[38px] rounded-[12px] flex-shrink-0"
            style={{
              background: "var(--gg-surface2)",
              border: "1px solid var(--gg-border)",
            }}
            aria-label="Wróć"
          >
            <svg
              width="18"
              height="18"
              viewBox="0 0 24 24"
              fill="none"
              stroke="var(--gg-text)"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M15 18l-6-6 6-6" />
            </svg>
          </button>
        )}
        <div className="flex-1">
          {label && (
            <p
              className="text-[11px] font-bold uppercase tracking-[0.12em] mb-1"
              style={{ color: "var(--gg-text-muted)" }}
            >
              {label}
            </p>
          )}
          <h1
            className="font-barlow font-black leading-none"
            style={{
              fontSize: 36,
              letterSpacing: "-0.03em",
              color: "var(--gg-text)",
            }}
          >
            {title}
          </h1>
          {subtitle && (
            <p
              className="text-sm mt-1"
              style={{ color: "var(--gg-text-muted)" }}
            >
              {subtitle}
            </p>
          )}
          {action && <div className="mt-3">{action}</div>}
        </div>
      </div>

      {(actions || rightSlot) && (
        <div className="flex-shrink-0 ml-3">{actions || rightSlot}</div>
      )}
    </div>
  );
});
