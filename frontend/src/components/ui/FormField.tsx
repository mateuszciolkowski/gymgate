import { memo, type ReactNode } from "react";

export interface FormFieldProps {
  label?: string;
  optional?: boolean;
  hint?: string;
  error?: string | null;
  children: ReactNode;
  className?: string;
}

export const FormField = memo(function FormField({
  label,
  optional = false,
  hint,
  error,
  children,
  className = "mb-4",
}: FormFieldProps) {
  return (
    <div className={className}>
      {label && (
        <label className="block text-[12px] font-bold uppercase tracking-[0.06em] mb-2" style={{ color: "var(--gg-text-sub)" }}>
          {label}{" "}
          {optional && (
            <span style={{ color: "var(--gg-text-muted)", textTransform: "none", fontWeight: 400 }}>
              (opcjonalnie)
            </span>
          )}
        </label>
      )}

      {children}

      {hint && !error && (
        <p className="text-[11px] m-0 mt-1.5 leading-snug" style={{ color: "var(--gg-text-muted)" }}>
          {hint}
        </p>
      )}

      {error && (
        <p className="text-[12px] m-0 mt-1.5 font-medium" style={{ color: "var(--gg-error)" }}>
          {error}
        </p>
      )}
    </div>
  );
});
