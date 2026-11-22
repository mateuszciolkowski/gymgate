import { randomUUID } from "expo-crypto";
import { createContext, useCallback, useContext, useEffect, useMemo, useReducer, type ReactNode } from "react";
import { onDbChange } from "@/db/open";
import type { Ctx, Db } from "@/db/types";
import { makeClock } from "@/sync/clock";
import { useSession } from "./SessionProvider";
import { useSyncRequest } from "./SyncProvider";

export interface DbValue {
  db: Db;
  userId: string;
  newId: () => string;
  /** Calls the listener after the database changed (any writer: UI action, push or pull). Returns the unsubscribe. */
  subscribe: (listener: () => void) => () => void;
}

const DbContext = createContext<DbValue | null>(null);

/** Provides the database of the signed-in account (opened by the session, closed on logout / account switch). */
export function DbProvider({ children, value }: { children: ReactNode; value?: DbValue }) {
  const { session, state } = useSession();
  const own = useMemo<DbValue | null>(() => {
    const db = session.getDb();
    const userId = state.user?.id;
    // `state` is the dependency on purpose: the session replaces it whenever the database handle changes.
    return db && userId ? { db, userId, newId: randomUUID, subscribe: onDbChange } : null;
  }, [session, state]);
  return <DbContext.Provider value={value ?? own}>{children}</DbContext.Provider>;
}

export function useDbOptional(): DbValue | null {
  return useContext(DbContext);
}

export function useDb(): DbValue {
  const ctx = useContext(DbContext);
  if (!ctx) throw new Error("useDb needs a signed-in session");
  return ctx;
}

/** Re-runs `read` whenever the database changes (coalesced, 30 ms). `read` must be stable (useCallback). */
/**
 * Live read: re-runs `read` after database changes. `active = false` (a hidden screen, e.g. a tab under the workout
 * screen) skips re-reads and catches up once when it becomes active again, so a set save does not re-hydrate
 * every mounted list on the JS thread.
 */
export function useDbQuery<T>(read: (db: Db) => T, active = true): T {
  const { db, subscribe } = useDb();
  const [tick, bump] = useReducer((n: number) => n + 1, 0);
  useEffect(() => {
    if (!active) return; // hidden: no re-reads; `active` in the memo deps catches up once on return
    let timer: ReturnType<typeof setTimeout> | null = null;
    const off = subscribe(() => {
      timer ??= setTimeout(() => {
        timer = null;
        bump();
      }, 30);
    });
    return () => {
      off();
      if (timer) clearTimeout(timer);
    };
  }, [subscribe, active]);
  return useMemo(() => {
    void tick; // only forces a re-read after a database change
    void active;
    return read(db);
  }, [db, read, tick, active]);
}

/**
 * The one way screens write: builds the write context, runs the repository call and asks the sync engine to run
 * soon ("local-write"). Repository errors (validation, not found) propagate and trigger no sync.
 */
export function useAction(): <T>(run: (ctx: Ctx) => T) => T {
  const { db, userId, newId } = useDb();
  const requestSync = useSyncRequest();
  return useCallback(
    <T,>(run: (ctx: Ctx) => T): T => {
      const result = run({ db, userId, newId, now: makeClock(db) });
      requestSync("local-write");
      return result;
    },
    [db, userId, newId, requestSync],
  );
}
