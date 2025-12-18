import { memo } from 'react'

interface ScreenHeaderProps {
  title: string
  subtitle?: string
  action?: React.ReactNode
  onBack?: () => void
}

export const ScreenHeader = memo(function ScreenHeader({
  title,
  subtitle,
  action,
  onBack,
}: ScreenHeaderProps) {
  return (
    <div className="relative flex items-center justify-center py-4">
      {onBack && (
        <button onClick={onBack} className="absolute left-0">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className="h-6 w-6"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </button>
      )}
      <div className="text-center">
        <h1 className="text-2xl sm:text-3xl font-extrabold text-gray-900 dark:text-white">
          {title}
        </h1>
        {subtitle && <p className="text-gray-600 dark:text-gray-400 text-sm mt-1">{subtitle}</p>}
        {action && <div className="mt-3">{action}</div>}
      </div>
    </div>
  )
})
