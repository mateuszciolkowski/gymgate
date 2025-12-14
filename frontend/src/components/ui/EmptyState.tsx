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
    <div className="flex flex-col items-center justify-center text-center py-12 px-4">
      {icon && <div className="text-gray-400 dark:text-gray-600 mb-4">{icon}</div>}
      <p className="text-gray-700 dark:text-gray-400 text-lg">{title}</p>
      {description && <p className="text-gray-600 dark:text-gray-500 text-sm mt-2">{description}</p>}
    </div>
  )
})
