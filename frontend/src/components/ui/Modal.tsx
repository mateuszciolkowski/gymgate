import { useEffect, type ReactNode } from "react";

export interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: ReactNode;
  subtitle?: string;
  children: ReactNode;
  maxWidth?: "sm" | "md" | "lg" | "xl";
  showCloseButton?: boolean;
}

export function Modal({
  isOpen,
  onClose,
  title,
  subtitle,
  children,
  maxWidth = "md",
  showCloseButton = true,
}: ModalProps) {
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const maxWidthClass = {
    sm: "max-w-sm",
    md: "max-w-md",
    lg: "max-w-lg",
    xl: "max-w-xl",
  }[maxWidth];

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fadeIn"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        className={`w-full ${maxWidthClass} rounded-3xl p-5 sm:p-6 shadow-2xl transition-all animate-scaleUp`}
        style={{
          background: "var(--gg-surface)",
          border: "1px solid var(--gg-border)",
        }}
      >
        {(title || showCloseButton) && (
          <div className="flex items-center justify-between gap-3 mb-5">
            <div className="min-w-0">
              {typeof title === "string" ? (
                <h3 className="font-barlow font-bold text-[20px] m-0 truncate" style={{ color: "var(--gg-text)" }}>
                  {title}
                </h3>
              ) : (
                title
              )}
              {subtitle && (
                <p className="text-[12px] m-0 mt-0.5" style={{ color: "var(--gg-text-muted)" }}>
                  {subtitle}
                </p>
              )}
            </div>

            {showCloseButton && (
              <button
                type="button"
                onClick={onClose}
                className="w-8 h-8 rounded-full border-none cursor-pointer flex items-center justify-center shrink-0 transition-colors"
                style={{ background: "var(--gg-surface2)", color: "var(--gg-text-muted)" }}
                aria-label="Zamknij"
              >
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="18" y1="6" x2="6" y2="18"/>
                  <line x1="6" y1="6" x2="18" y2="18"/>
                </svg>
              </button>
            )}
          </div>
        )}

        {children}
      </div>
    </div>
  );
}
