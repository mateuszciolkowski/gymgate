import type { AuthData, SessionUser, Transport } from "../api/contract";
import { createApiClient, type RequestOptions } from "../api/client";
import { HttpError, ReauthRequiredError } from "../api/errors";
import { getProfile } from "../db/repositories/profile";
import type { Db } from "../db/types";
import { pendingCount } from "../sync/outbox";

/** Platform storage (Keychain/Keystore in the app, a Map in tests). `secureStore` matches. */
export interface KeyValueStore {
  get(key: string): Promise<string | null>;
  set(key: string, value: string): Promise<void>;
  remove(key: string): Promise<void>;
}

const KEYS = {
  access: "gymgate.accessToken",
  refresh: "gymgate.refreshToken",
  deviceId: "gymgate.deviceId",
  /** Account whose local database holds this device's data; survives re-auth and "keep my data" logout. */
  userId: "gymgate.userId",
  reauth: "gymgate.reauth",
} as const;

export type SessionStatus = "signedOut" | "active" | "reauthRequired";

export interface SessionState {
  status: SessionStatus;
  user: SessionUser | null;
}

/** Thrown before anything is changed when pending local changes need an explicit user decision. */
export class PendingChangesError extends Error {
  constructor(readonly pending: number) {
    super(`${pending} unsent changes`);
  }
}

export interface SessionOptions {
  baseUrl?: string;
  fetchImpl?: typeof fetch;
  store: KeyValueStore;
  /** Opens (and migrates) the local database of an account: `gymgate-{userId}.db`. */
  openDb: (userId: string) => Db;
  /** Closes and deletes that file. */
  deleteDb: (userId: string) => void;
  newId: () => string;
}

export interface AccountSwitchOptions {
  /** Explicit consent to leave unsent changes of the previous account on the device (they wait for that account). */
  allowAccountSwitch?: boolean;
}

export function createSession(opts: SessionOptions) {
  const { store } = opts;
  let accessToken: string | null = null;
  let state: SessionState = { status: "signedOut", user: null };
  let db: Db | null = null;
  let refreshing: Promise<void> | null = null;
  const listeners = new Set<() => void>();

  const set = (next: SessionState) => {
    state = next;
    listeners.forEach((l) => l());
  };
  const client = createApiClient({ baseUrl: opts.baseUrl, fetchImpl: opts.fetchImpl, tokenProvider: { getToken: () => accessToken } });
  const pendingOf = (userId: string) => pendingCount(db && state.user?.id === userId ? db : opts.openDb(userId));

  async function deviceId(): Promise<string> {
    const existing = await store.get(KEYS.deviceId);
    if (existing) return existing;
    const id = opts.newId();
    await store.set(KEYS.deviceId, id);
    return id;
  }

  async function saveTokens(data: AuthData): Promise<void> {
    accessToken = data.accessToken;
    await store.set(KEYS.access, data.accessToken);
    await store.set(KEYS.refresh, data.refreshToken);
  }

  async function reauthRequired(): Promise<never> {
    accessToken = null;
    await store.remove(KEYS.access);
    await store.remove(KEYS.refresh);
    await store.set(KEYS.reauth, "1");
    set({ ...state, status: "reauthRequired" });
    throw new ReauthRequiredError();
  }

  /** Single-flight: parallel callers share one refresh. Only a 401 from the refresh endpoint changes the session. */
  function refresh(): Promise<void> {
    refreshing ??= (async () => {
      const token = await store.get(KEYS.refresh);
      if (!token) return reauthRequired();
      try {
        const res = await client.post<{ data: AuthData }>("/api/auth/mobile/refresh", { refreshToken: token }, { auth: false });
        await saveTokens(res.data);
      } catch (error) {
        if (error instanceof HttpError && error.status === 401) return reauthRequired();
        throw error; // network, timeout, 5xx: session untouched
      }
    })().finally(() => {
      refreshing = null;
    });
    return refreshing;
  }

  /** Authorised request: one refresh + one retry on 401; refresh refused -> ReauthRequiredError. */
  async function request<T>(path: string, o: RequestOptions = {}): Promise<T> {
    if (state.status !== "active") throw new ReauthRequiredError();
    if (!accessToken) await refresh();
    try {
      return await client.request<T>(path, o);
    } catch (error) {
      if (!(error instanceof HttpError && error.status === 401)) throw error;
      await refresh();
      return client.request<T>(path, o);
    }
  }

  const api: Transport = {
    get: (path) => request(path),
    post: (path, body) => request(path, { method: "POST", body }),
  };

  async function enter(data: AuthData, accept: AccountSwitchOptions): Promise<Db> {
    const previous = await store.get(KEYS.userId);
    if (previous && previous !== data.user.id && !accept.allowAccountSwitch) {
      const pending = pendingOf(previous);
      if (pending > 0) {
        void client.post("/api/auth/mobile/logout", { refreshToken: data.refreshToken }, { auth: false }).catch(() => undefined);
        throw new PendingChangesError(pending);
      }
    }
    await saveTokens(data);
    await store.set(KEYS.userId, data.user.id);
    await store.remove(KEYS.reauth);
    db = opts.openDb(data.user.id);
    set({ status: "active", user: data.user });
    return db;
  }

  const authBody = (extra: object) => deviceId().then((id) => ({ ...extra, deviceId: id }));

  return {
    api,
    getState: (): SessionState => state,
    getDb: (): Db | null => db,
    deviceId,
    subscribe(listener: () => void): () => void {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },

    /** App start: no network. A stored account and refresh token (or a pending re-login) open the local database. */
    async restore(): Promise<SessionState> {
      const userId = await store.get(KEYS.userId);
      if (!userId) return state;
      const expired = (await store.get(KEYS.reauth)) !== null;
      // No tokens and no "expired" mark = the user logged out choosing "keep my data": stay signed out, show nothing.
      if (!expired && !(await store.get(KEYS.refresh))) return state;
      db = opts.openDb(userId);
      accessToken = await store.get(KEYS.access);
      const needsLogin = expired || !(await store.get(KEYS.refresh));
      set({ status: needsLogin ? "reauthRequired" : "active", user: getProfile(db) as SessionUser | null });
      return state;
    },

    async login(email: string, password: string, o: AccountSwitchOptions = {}): Promise<Db> {
      const res = await client.post<{ data: AuthData }>("/api/auth/mobile/login", await authBody({ email, password }), { auth: false });
      return enter(res.data, o);
    },

    async register(input: { email: string; password: string; firstName: string; lastName: string; phone?: string }, o: AccountSwitchOptions = {}): Promise<Db> {
      const res = await client.post<{ data: AuthData }>("/api/auth/mobile/register", await authBody(input), { auth: false });
      return enter(res.data, o);
    },

    /**
     * Signs out. With unsent changes the caller must choose: "keep" (database stays for the next login of this account)
     * or "discard" (deviation from the PWA, which drops them silently); otherwise PendingChangesError is thrown.
     */
    async logout(o: { pendingChanges?: "keep" | "discard" } = {}): Promise<void> {
      const userId = state.user?.id ?? (await store.get(KEYS.userId));
      const pending = db ? pendingCount(db) : 0;
      if (pending > 0 && !o.pendingChanges) throw new PendingChangesError(pending);
      const refreshToken = await store.get(KEYS.refresh);
      if (refreshToken) await client.post("/api/auth/mobile/logout", { refreshToken }, { auth: false }).catch(() => undefined);
      accessToken = null;
      for (const k of [KEYS.access, KEYS.refresh, KEYS.reauth]) await store.remove(k);
      db = null;
      if (userId && o.pendingChanges !== "keep") {
        opts.deleteDb(userId);
        await store.remove(KEYS.userId);
      }
      set({ status: "signedOut", user: null });
    },

    /** Needs the network and the password; a wrong password is 403 and leaves the session as it is. */
    async deleteAccount(password: string): Promise<void> {
      const userId = state.user?.id;
      await request("/api/auth/account", { method: "DELETE", body: { password } });
      accessToken = null;
      for (const k of [KEYS.access, KEYS.refresh, KEYS.reauth, KEYS.userId]) await store.remove(k);
      db = null;
      if (userId) opts.deleteDb(userId);
      set({ status: "signedOut", user: null });
    },
  };
}

export type Session = ReturnType<typeof createSession>;
