interface IconProps {
  className?: string
}

export const DumbbellIcon = ({ className = 'w-6 h-6' }: IconProps) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    fill="none"
    viewBox="0 0 24 24"
    strokeWidth={1.5}
    stroke="currentColor"
    className={className}
  >
    <rect x="2" y="9" width="3" height="6" rx="1" />
    <rect x="5" y="7" width="2" height="10" rx="0.5" />
    <rect x="7" y="11" width="10" height="2" rx="0.5" />
    <rect x="17" y="7" width="2" height="10" rx="0.5" />
    <rect x="19" y="9" width="3" height="6" rx="1" />
  </svg>
)
