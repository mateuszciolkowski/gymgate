import { memo, type ReactNode } from 'react'

interface ScreenContainerProps {
  children: ReactNode
  className?: string
}

export const ScreenContainer = memo(function ScreenContainer({
  children,
  className = '',
}: ScreenContainerProps) {
  return (
    <section
      className={`bg-light-100 dark:bg-gray-800 rounded-3xl p-5 sm:p-6 border border-gray-300 dark:border-gray-700 my-2 transition-colors ${className}`.trim()}
    >
      {children}
    </section>
  )
})
