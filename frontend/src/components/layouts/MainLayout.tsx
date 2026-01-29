import { memo, type ReactNode } from "react";
import { useTheme } from "@/hooks";
import { useAuth } from "@/contexts/AuthContext";

interface MainLayoutProps {
  children: ReactNode;
  bottomBar?: ReactNode;
}

export const MainLayout = memo(function MainLayout({
  children,
  bottomBar,
}: MainLayoutProps) {
  const { user } = useAuth();
  const { toggleTheme, isDark } = useTheme();

  return (
    <div className="min-h-screen min-h-[100dvh] bg-white dark:bg-gray-900 md:bg-light-50 md:dark:bg-gray-950 text-gray-900 dark:text-gray-100 flex items-center justify-center md:p-6 lg:p-10 transition-colors">
      <div className="w-full h-[100dvh] md:h-[85vh] md:max-h-[900px] md:w-[430px] md:rounded-3xl md:border md:border-gray-200 dark:border-gray-800 md:shadow-2xl md:shadow-black/50 bg-white dark:bg-gray-900 relative overflow-hidden flex flex-col transition-colors">
        <header className="px-5 pt-4 pb-4 flex items-center justify-between">
          <h1 className="text-xl font-semibold text-gray-900 dark:text-white flex-1 text-center">
            Witaj,{" "}
            <span className="text-emerald-600 dark:text-emerald-500">
              {user?.firstName}
            </span>{" "}
            👋
          </h1>
          <button
            onClick={toggleTheme}
            className="p-2 rounded-lg bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
            aria-label="Toggle theme"
          >
            {isDark ? (
              <svg
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
                strokeWidth={2}
                stroke="currentColor"
                className="w-5 h-5 text-yellow-400"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M12 3v2.25m6.364.386l-1.591 1.591M21 12h-2.25m-.386 6.364l-1.591-1.591M12 18.75V21m-4.773-4.227l-1.591 1.591M5.25 12H3m4.227-4.773L5.636 5.636M15.75 12a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0z"
                />
              </svg>
            ) : (
              <svg
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
                strokeWidth={2}
                stroke="currentColor"
                className="w-5 h-5 text-gray-700"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M21.752 15.002A9.718 9.718 0 0118 15.75c-5.385 0-9.75-4.365-9.75-9.75 0-1.33.266-2.597.748-3.752A9.753 9.753 0 003 11.25C3 16.635 7.365 21 12.75 21a9.753 9.753 0 009.002-5.998z"
                />
              </svg>
            )}
          </button>
        </header>

        <main className="flex-1 overflow-y-auto p-3 pb-20">
          {children}
        </main>

        {bottomBar}
      </div>
    </div>
  );
});
