import { eq } from "drizzle-orm";
import type { Transport } from "../api/contract";
import { isTransient, NetworkError, ReauthRequiredError, TimeoutError } from "../api/errors";
import { syncState } from "../db/schema";
import type { Clock, Db } from "../db/types";
import { openIssueCount } from "./issues";
import { pendingCount } from "./outbox";
import { pullAll } from "./pull";
import { pushAll } from "./push";

export type SyncStatus = "idle" | "syncing" | "offline" | "error" | "paused";
export type SyncReason = "start" | "foreground" | "network" | "local-write" | "timer" | "manual";

export interface SyncEngineState {
  status: SyncStatus;
  pending: number;
  lastSuccessAt: string | null;
  openIssues: number;
  lastError: string | null;
}

/** Platform event source (AppState, NetInfo...): receives the trigger, returns an unsubscribe function. */
export type SyncEventSource = (trigger: (reason: SyncReason) => void) => () => void;

export interface SyncEngineOptions {
  db: Db;
  api: Transport;
  deviceId: string;
  now: Clock;
  /** True while the session needs a new login: cycles are skipped, the outbox stays. */
  isPaused?: () => boolean;
  sources?: SyncEventSource[];
  debounceMs?: number;
  periodMs?: number;
}

const RETRY_MS = [5_000, 15_000, 60_000, 300_000];
/** Delay before retry number `failures` (0 = first failure): 5 s, 15 s, 60 s, then every 5 minutes. */
export const retryDelayMs = (failures: number): number => RETRY_MS[Math.min(failures, RETRY_MS.length - 1)] as number;

/** These reasons mean "the situation changed": they cancel a backoff and run immediately. */
const RESETTING: ReadonlySet<SyncReason> = new Set(["start", "foreground", "network", "manual"]);

export function createSyncEngine(opts: SyncEngineOptions) {
  const { db, api, deviceId, now } = opts;
  const debounceMs = opts.debounceMs ?? 2_000;
  const periodMs = opts.periodMs ?? 120_000;
  const listeners = new Set<() => void>();
  let running: Promise<void> | null = null;
  let again = false;
  let forceSnapshot = false;
  let failures = 0;
  let retryTimer: ReturnType<typeof setTimeout> | null = null;
  let debounceTimer: ReturnType<typeof setTimeout> | null = null;
  let periodTimer: ReturnType<typeof setInterval> | null = null;
  let unsubscribe: Array<() => void> = [];

  let state: SyncEngineState = {
    status: "idle",
    pending: pendingCount(db),
    lastSuccessAt: db.select().from(syncState).where(eq(syncState.id, 1)).get()?.lastSyncAt ?? null,
    openIssues: openIssueCount(db),
    lastError: null,
  };
  const set = (patch: Partial<SyncEngineState>) => {
    state = { ...state, ...patch };
    listeners.forEach((l) => l());
  };
  const refreshCounts = () => set({ pending: pendingCount(db), openIssues: openIssueCount(db) });

  const clear = (t: ReturnType<typeof setTimeout> | null) => t && clearTimeout(t);

  async function cycle(): Promise<void> {
    if (opts.isPaused?.()) return set({ status: "paused" });
    set({ status: "syncing" });
    try {
      await pushAll({ db, api, deviceId, now });
      const snapshot = forceSnapshot;
      forceSnapshot = false;
      await pullAll({ db, api }, { forceSnapshot: snapshot });
      const at = now();
      db.insert(syncState).values({ id: 1, lastSyncAt: at }).onConflictDoUpdate({ target: syncState.id, set: { lastSyncAt: at } }).run();
      failures = 0;
      set({ status: "idle", lastSuccessAt: at, lastError: null });
    } catch (error) {
      if (error instanceof ReauthRequiredError) {
        set({ status: "paused", lastError: error.message });
      } else {
        const offline = error instanceof NetworkError || error instanceof TimeoutError;
        set({ status: offline ? "offline" : "error", lastError: error instanceof Error ? error.message : String(error) });
        // Transient or not: never give up (no attempt limit), but back off.
        if (!isTransient(error)) console.warn("sync cycle failed:", error);
        clear(retryTimer);
        retryTimer = setTimeout(() => {
          retryTimer = null;
          void syncNow();
        }, retryDelayMs(failures++));
      }
    }
    refreshCounts();
  }

  /** One cycle (push, then pull). Single-flight: callers during a running cycle share it and trigger one more run. */
  function syncNow(): Promise<void> {
    if (running) {
      again = true;
      return running;
    }
    running = (async () => {
      do {
        again = false;
        await cycle();
      } while (again && state.status !== "paused");
    })().finally(() => {
      running = null;
    });
    return running;
  }

  function requestSync(reason: SyncReason): void {
    if (reason === "local-write") refreshCounts();
    if (RESETTING.has(reason)) {
      clear(retryTimer);
      clear(debounceTimer);
      retryTimer = debounceTimer = null;
      failures = 0;
      void syncNow();
    } else if (retryTimer) {
      // A backoff retry is already scheduled.
    } else if (reason === "timer") {
      void syncNow();
    } else {
      clear(debounceTimer);
      debounceTimer = setTimeout(() => {
        debounceTimer = null;
        void syncNow();
      }, debounceMs);
    }
  }

  return {
    getState: (): SyncEngineState => state,
    subscribe(listener: () => void): () => void {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    syncNow,
    requestSync,
    /** Settings "refresh cache": sends the outbox first, then replaces local data from a full snapshot. */
    resync(): Promise<void> {
      forceSnapshot = true;
      clear(retryTimer);
      retryTimer = null;
      return syncNow();
    },
    /** Recount pending changes and issues (after local edits that do not go through requestSync). */
    refreshCounts,
    start(): void {
      if (periodTimer) return;
      periodTimer = setInterval(() => requestSync("timer"), periodMs);
      unsubscribe = (opts.sources ?? []).map((source) => source(requestSync));
      requestSync("start");
    },
    stop(): void {
      if (periodTimer) clearInterval(periodTimer);
      periodTimer = null;
      clear(retryTimer);
      clear(debounceTimer);
      retryTimer = debounceTimer = null;
      unsubscribe.forEach((u) => u());
      unsubscribe = [];
    },
  };
}

export type SyncEngine = ReturnType<typeof createSyncEngine>;
