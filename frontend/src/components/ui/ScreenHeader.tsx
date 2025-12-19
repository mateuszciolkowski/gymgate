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
    <div className="relative flex items-center justify-between py-4">
      {onBack && (
        <button 
          onClick={onBack} 
          className="flex items-center justify-center w-9 h-9 rounded-full bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
          aria-label="Wróć"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className="h-5 w-5 text-gray-700 dark:text-gray-300"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M15 19l-7-7 7-7" />
          </svg>
        </button>
      )}
      <div className={`flex-1 ${onBack ? 'text-center' : 'text-left'}`}>
        <h1 className="text-2xl sm:text-3xl font-extrabold text-gray-900 dark:text-white">
          {title}
        </h1>
        {subtitle && <p className="text-gray-600 dark:text-gray-400 text-sm mt-1">{subtitle}</p>}
        {action && <div className="mt-3">{action}</div>}
      </div>
      {onBack && <div className="w-9" />} {/* Spacer dla wyrównania */}
    </div>
  )
})
