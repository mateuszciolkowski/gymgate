import { createContext, useContext } from "react";

export interface NavUser {
  firstName: string;
  lastName: string;
  email: string;
}

interface NavContextValue {
  drawerOpen: boolean;
  openDrawer: () => void;
  closeDrawer: () => void;
}

export const NavContext = createContext<NavContextValue | null>(null);

export function useNav(): NavContextValue {
  const ctx = useContext(NavContext);
  if (!ctx) throw new Error("useNav must be used inside <NavShell>");
  return ctx;
}
