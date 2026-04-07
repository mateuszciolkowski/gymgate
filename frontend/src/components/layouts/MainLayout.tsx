import { memo, type ReactNode } from "react";

interface MainLayoutProps {
  children: ReactNode;
  bottomBar?: ReactNode;
}

export const MainLayout = memo(function MainLayout({
  children,
  bottomBar,
}: MainLayoutProps) {
  return (
    <div className="min-h-screen min-h-[100dvh] bg-white dark:bg-gray-900 md:bg-light-50 md:dark:bg-gray-950 text-gray-900 dark:text-gray-100 flex items-center justify-center md:p-6 lg:p-10 transition-colors">
      <div className="w-full h-[100dvh] md:h-[85vh] md:max-h-[900px] md:w-[430px] md:rounded-3xl md:border md:border-gray-200 dark:border-gray-800 md:shadow-2xl md:shadow-black/50 bg-white dark:bg-gray-900 relative overflow-hidden flex flex-col transition-colors">
        <main className="flex-1 overflow-y-auto p-3 pb-20">{children}</main>

        {bottomBar}
      </div>
    </div>
  );
});
