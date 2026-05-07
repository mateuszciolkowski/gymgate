import { memo } from 'react'

interface EmptyStateProps {
  title: string
  description?: string
  icon?: React.ReactNode
}

export const EmptyState = memo(function EmptyState({
  title,
  description,
  icon,
}: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center text-center py-10 px-4">
      {icon && (
        <div
          className="flex items-center justify-center w-16 h-16 rounded-[20px] mb-4"
          style={{
            background: "var(--gg-surface2)",
            boxShadow: "var(--gg-shadow)",
            color: "var(--gg-text-muted)",
          }}
        >
          {icon}
        </div>
      )}
      <p className="text-[15px] font-bold mb-2" style={{ color: "var(--gg-text)" }}>
        {title}
      </p>
      {description && (
        <p className="text-[13px]" style={{ color: "var(--gg-text-muted)" }}>
          {description}
        </p>
      )}
    </div>
  )
})
