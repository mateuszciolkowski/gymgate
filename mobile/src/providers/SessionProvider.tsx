import { randomUUID } from "expo-crypto";
import { createContext, useCallback, useContext, useEffect, useMemo, useState, useSyncExternalStore, type ReactNode } from "react";
import { closeAppDb, deleteAppDb, openAppDb } from "@/db/open";
import { createSession, type AccountSwitchOptions, type Session, type SessionState } from "@/session";
import { secureStore } from "@/session/secureStore";

interface SessionContextValue {
  session: Session;
  state: SessionState;
  /** False until the stored session was read (no network involved). */
  ready: boolean;
  login: Session["login"];
  register: Session["register"];
  logout: Session["logout"];
}

const SessionContext = createContext<SessionContextValue | null>(null);

export function SessionProvider({ children, session: injected }: { children: ReactNode; session?: Session }) {
  const session = useMemo(
    () => injected ?? createSession({ store: secureStore, openDb: openAppDb, deleteDb: deleteAppDb, newId: randomUUID }),
    [injected],
  );
  const state = useSyncExternalStore(session.subscribe, session.getState);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    void session.restore().finally(() => setReady(true));
  }, [session]);

  // Leaving an account (switch or "keep my data" logout) closes its file handle; the data stays on disk.
  const login = useCallback<Session["login"]>(
    async (email: string, password: string, o?: AccountSwitchOptions) => {
      const previous = session.getState().user?.id;
      const db = await session.login(email, password, o);
      const now = session.getState().user?.id;
      if (previous && previous !== now) closeAppDb(previous);
      return db;
    },
    [session],
  );
  const logout = useCallback<Session["logout"]>(
    async (o) => {
      const userId = session.getState().user?.id;
      await session.logout(o);
      if (userId) closeAppDb(userId);
    },
    [session],
  );

  const value = useMemo(
    () => ({ session, state, ready, login, register: session.register, logout }),
    [session, state, ready, login, logout],
  );
  return <SessionContext.Provider value={value}>{children}</SessionContext.Provider>;
}

export function useSession(): SessionContextValue {
  const ctx = useContext(SessionContext);
  if (!ctx) throw new Error("useSession must be used inside <SessionProvider>");
  return ctx;
}
