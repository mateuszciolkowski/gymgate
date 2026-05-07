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
      className={`px-5 pt-5 pb-2 screen-enter ${className}`.trim()}
    >
      {children}
    </section>
  )
})
