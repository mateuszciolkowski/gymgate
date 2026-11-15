import NetInfo, { useNetInfo } from "@react-native-community/netinfo";
import { createContext, useCallback, useContext, useEffect, useMemo, useState, useSyncExternalStore, type ReactNode } from "react";
import { AppState } from "react-native";
import { makeClock } from "@/sync/clock";
import { createSyncEngine, type SyncEngine, type SyncEngineState, type SyncEventSource, type SyncReason } from "@/sync";
import { useDbOptional } from "./DbProvider";
import { useSession } from "./SessionProvider";

const appForeground: SyncEventSource = (trigger) => {
  const sub = AppState.addEventListener("change", (s) => s === "active" && trigger("foreground"));
  return () => sub.remove();
};
const networkBack: SyncEventSource = (trigger) => NetInfo.addEventListener((s) => s.isConnected && trigger("network"));

const IDLE: SyncEngineState = { status: "idle", pending: 0, lastSuccessAt: null, openIssues: 0, lastError: null };
const noSubscribe = () => () => undefined;

interface SyncContextValue {
  engine: SyncEngine | null;
  state: SyncEngineState;
  /** Device reports no connection (NetInfo) or the last cycle could not reach the server. */
  offline: boolean;
}

const SyncContext = createContext<SyncContextValue>({ engine: null, state: IDLE, offline: false });

/** Creates the sync engine of the open database and feeds it the app-foreground and network events. */
export function SyncProvider({ children }: { children: ReactNode }) {
  const { session, state: sessionState } = useSession();
  const dbValue = useDbOptional();
  const db = dbValue?.db ?? null;
  const [engine, setEngine] = useState<SyncEngine | null>(null);
  const net = useNetInfo();

  useEffect(() => {
    if (!db) return;
    let cancelled = false;
    let created: SyncEngine | null = null;
    void session.deviceId().then((deviceId) => {
      if (cancelled) return;
      created = createSyncEngine({
        db,
        api: session.api,
        deviceId,
        now: makeClock(db),
        isPaused: () => session.getState().status !== "active",
        sources: [appForeground, networkBack],
      });
      created.start();
      setEngine(created);
    });
    return () => {
      cancelled = true;
      created?.stop();
      setEngine(null);
    };
  }, [db, session]);

  // A new login after "reauthRequired" resumes the paused engine.
  useEffect(() => {
    if (sessionState.status === "active") engine?.requestSync("manual");
  }, [sessionState.status, engine]);

  const state = useSyncExternalStore(engine?.subscribe ?? noSubscribe, engine?.getState ?? (() => IDLE));
  const offline = net.isConnected === false || state.status === "offline";
  const value = useMemo(() => ({ engine, state, offline }), [engine, state, offline]);
  return <SyncContext.Provider value={value}>{children}</SyncContext.Provider>;
}

export const useSync = (): SyncContextValue => useContext(SyncContext);

/** Stable function: asks the engine to sync (no-op until the engine exists). */
export function useSyncRequest(): (reason: SyncReason) => void {
  const { engine } = useSync();
  return useCallback((reason) => engine?.requestSync(reason), [engine]);
}
