import { memo } from 'react'

interface ScreenHeaderProps {
  title: string
  subtitle?: string
  action?: React.ReactNode
}

export const ScreenHeader = memo(function ScreenHeader({
  title,
  subtitle,
  action,
}: ScreenHeaderProps) {
  return (
    <div className="text-center">
      <h1 className="text-2xl sm:text-3xl font-extrabold text-gray-900 dark:text-white">{title}</h1>
      {subtitle && <p className="text-gray-600 dark:text-gray-400 text-sm mt-1">{subtitle}</p>}
      {action && <div className="mt-3">{action}</div>}
    </div>
  )
})
