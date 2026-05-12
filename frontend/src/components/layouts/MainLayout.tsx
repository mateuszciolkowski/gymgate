import { memo, type ReactNode } from "react";

interface MainLayoutProps {
  children: ReactNode;
  bottomBar?: ReactNode;
  topBanner?: ReactNode;
  drawer?: ReactNode;
}

export const MainLayout = memo(function MainLayout({
  children,
  bottomBar,
  topBanner,
  drawer,
}: MainLayoutProps) {
  return (
    <div
      className="min-h-screen min-h-[100dvh] flex items-center justify-center md:p-6 lg:p-10"
      style={{ background: "var(--gg-bg)", overflow: "hidden", height: "100dvh" }}
    >
      <div
        className="w-full h-[100dvh] md:h-[85vh] md:max-h-[900px] md:w-[430px] md:rounded-[52px] md:shadow-[0_40px_100px_rgba(0,0,0,0.65),0_0_0_10px_#181818,0_0_0_12px_#282828] relative overflow-hidden flex flex-col"
        style={{ background: "var(--gg-bg)" }}
      >
        {topBanner}
        <main
          className="flex-1 overflow-y-auto pb-24 scrollbar-hide"
          style={{ overscrollBehavior: "none" }}
        >
          {children}
        </main>

        {drawer}
        {bottomBar}
      </div>
    </div>
  );
});
