import { memo } from 'react'
import { ScreenContainer, ScreenHeader } from '@/components/ui'

interface MenuItemProps {
  label: string
  description?: string
  onClick?: () => void
  icon?: React.ReactNode
  danger?: boolean
}

const MenuItem = memo(function MenuItem({
  label,
  description,
  onClick,
  icon,
  danger = false,
}: MenuItemProps) {
  return (
    <button
      onClick={onClick}
      className={`w-full bg-white dark:bg-gray-900 p-5 rounded-xl border border-gray-300 dark:border-gray-700 text-left hover:bg-accent-50 dark:hover:bg-gray-800 hover:border-emerald-300 dark:hover:border-gray-600 active:bg-accent-100 dark:active:bg-gray-700 transition-all flex items-center gap-4 ${
        danger ? 'text-red-500 dark:text-red-400' : 'text-gray-900 dark:text-white'
      }`}
    >
      {icon && (
        <span className={`${danger ? 'text-red-500 dark:text-red-400' : 'text-gray-600 dark:text-gray-400'}`}>
          {icon}
        </span>
      )}
      <div className="flex-1">
        <p className="font-medium">{label}</p>
        {description && (
          <p className="text-gray-600 dark:text-gray-500 text-sm mt-0.5">{description}</p>
        )}
      </div>
      <svg
        xmlns="http://www.w3.org/2000/svg"
        fill="none"
        viewBox="0 0 24 24"
        strokeWidth={1.5}
        stroke="currentColor"
        className="w-5 h-5 text-gray-400 dark:text-gray-500"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M8.25 4.5l7.5 7.5-7.5 7.5"
        />
      </svg>
    </button>
  )
})

export const MenuScreen = memo(function MenuScreen() {
  return (
    <ScreenContainer>
      <ScreenHeader title="Menu" subtitle="Ustawienia i więcej" />

      <div className="mt-6 space-y-2">
        <MenuItem
          label="Profil"
          description="Zarządzaj swoim profilem"
          icon={
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6">
              <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z" />
            </svg>
          }
        />

        <MenuItem
          label="Ustawienia"
          description="Preferencje aplikacji"
          icon={
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6">
              <path strokeLinecap="round" strokeLinejoin="round" d="M9.594 3.94c.09-.542.56-.94 1.11-.94h2.593c.55 0 1.02.398 1.11.94l.213 1.281c.063.374.313.686.645.87.074.04.147.083.22.127.324.196.72.257 1.075.124l1.217-.456a1.125 1.125 0 011.37.49l1.296 2.247a1.125 1.125 0 01-.26 1.431l-1.003.827c-.293.24-.438.613-.431.992a6.759 6.759 0 010 .255c-.007.378.138.75.43.99l1.005.828c.424.35.534.954.26 1.43l-1.298 2.247a1.125 1.125 0 01-1.369.491l-1.217-.456c-.355-.133-.75-.072-1.076.124a6.57 6.57 0 01-.22.128c-.331.183-.581.495-.644.869l-.213 1.28c-.09.543-.56.941-1.11.941h-2.594c-.55 0-1.02-.398-1.11-.94l-.213-1.281c-.062-.374-.312-.686-.644-.87a6.52 6.52 0 01-.22-.127c-.325-.196-.72-.257-1.076-.124l-1.217.456a1.125 1.125 0 01-1.369-.49l-1.297-2.247a1.125 1.125 0 01.26-1.431l1.004-.827c.292-.24.437-.613.43-.992a6.932 6.932 0 010-.255c.007-.378-.138-.75-.43-.99l-1.004-.828a1.125 1.125 0 01-.26-1.43l1.297-2.247a1.125 1.125 0 011.37-.491l1.216.456c.356.133.751.072 1.076-.124.072-.044.146-.087.22-.128.332-.183.582-.495.644-.869l.214-1.281z" />
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
          }
        />

        <MenuItem
          label="Eksportuj dane"
          description="Pobierz swoje dane treningowe"
          icon={
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6">
              <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3" />
            </svg>
          }
        />

        <MenuItem
          label="Pomoc"
          description="FAQ i wsparcie"
          icon={
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6">
              <path strokeLinecap="round" strokeLinejoin="round" d="M9.879 7.519c1.171-1.025 3.071-1.025 4.242 0 1.172 1.025 1.172 2.687 0 3.712-.203.179-.43.326-.67.442-.745.361-1.45.999-1.45 1.827v.75M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-9 5.25h.008v.008H12v-.008z" />
            </svg>
          }
        />

        <div className="pt-4">
          <MenuItem
            label="Wyloguj się"
            danger
            icon={
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6">
                <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 9V5.25A2.25 2.25 0 0013.5 3h-6a2.25 2.25 0 00-2.25 2.25v13.5A2.25 2.25 0 007.5 21h6a2.25 2.25 0 002.25-2.25V15M12 9l-3 3m0 0l3 3m-3-3h12.75" />
              </svg>
            }
          />
        </div>
      </div>

      <div className="mt-8 text-center">
        <p className="text-gray-600 dark:text-gray-400 text-sm">GymGate v1.0.0</p>
      </div>
    </ScreenContainer>
  )
})
