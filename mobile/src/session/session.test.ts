import { HttpError, NetworkError, ReauthRequiredError } from "../api/errors";
import { createWorkout, saveProfile } from "../db/repositories";
import { openNodeDb, testCtx } from "../db/testing";
import type { Db } from "../db/types";
import { createSession, PendingChangesError, type KeyValueStore } from "./session";

const user = (id: string) => ({ id, email: `${id}@t.pl`, firstName: "T", lastName: "T", phone: null, isAdmin: false, activeWorkoutId: null });
const auth = (id: string, n = 1) => ({ success: true, data: { user: user(id), accessToken: `acc${n}`, accessTokenExpiresIn: 3600, refreshToken: `ref${n}`, refreshTokenExpiresAt: "2027-01-01T00:00:00.000Z" } });
const json = (status: number, body: unknown) => new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } });

function memoryStore(): KeyValueStore & { data: Map<string, string> } {
  const data = new Map<string, string>();
  return { data, get: async (k) => data.get(k) ?? null, set: async (k, v) => void data.set(k, v), remove: async (k) => void data.delete(k) };
}

function setup(route: (url: string, init: RequestInit) => Response | Promise<Response>) {
  const store = memoryStore();
  const dbs = new Map<string, Db>();
  const calls: Array<{ url: string; auth: string | undefined; body: unknown }> = [];
  const fetchImpl = (async (url: string, init: RequestInit) => {
    const headers = init.headers as Record<string, string>;
    calls.push({ url: url.replace("http://x.test", ""), auth: headers.Authorization, body: init.body ? JSON.parse(init.body as string) : undefined });
    return route(url.replace("http://x.test", ""), init);
  }) as typeof fetch;
  let n = 0;
  const session = createSession({
    baseUrl: "http://x.test",
    fetchImpl,
    store,
    openDb: (id) => dbs.get(id) ?? dbs.set(id, openNodeDb()).get(id)!,
    deleteDb: (id) => void dbs.delete(id),
    newId: () => `dev-${++n}`,
  });
  return { session, store, dbs, calls };
}

describe("session", () => {
  it("login stores tokens, opens the account database and keeps one stable deviceId", async () => {
    const { session, store, dbs, calls } = setup(() => json(200, auth("u1")));
    await session.login("a@t.pl", "pw");
    expect(session.getState()).toMatchObject({ status: "active", user: { id: "u1" } });
    expect([...dbs.keys()]).toEqual(["u1"]);
    expect(store.data.get("gymgate.refreshToken")).toBe("ref1");
    expect(calls[0]!.body).toMatchObject({ email: "a@t.pl", deviceId: "dev-1" });
    expect(calls[0]!.auth).toBeUndefined();
    await session.login("a@t.pl", "pw");
    expect(calls[1]!.body).toMatchObject({ deviceId: "dev-1" });
  });

  it("401 -> one refresh -> retry; parallel 401s share a single refresh", async () => {
    let valid = "acc1";
    const { session, calls } = setup((url, init) => {
      if (url.endsWith("/login")) return json(200, auth("u1"));
      if (url.endsWith("/refresh")) {
        valid = "acc2";
        return json(200, auth("u1", 2));
      }
      return (init.headers as Record<string, string>).Authorization === `Bearer ${valid}` ? json(200, { success: true, data: "ok" }) : json(401, { success: false, error: "expired" });
    });
    await session.login("a", "b");
    valid = "other"; // server now rejects acc1
    const results = await Promise.all([session.api.get("/api/x"), session.api.get("/api/y"), session.api.get("/api/z")]);
    expect(results).toHaveLength(3);
    expect(calls.filter((c) => c.url.endsWith("/refresh"))).toHaveLength(1);
    expect(calls.find((c) => c.url.endsWith("/refresh"))!.body).toEqual({ refreshToken: "ref1" });
    expect(session.getState().status).toBe("active");
  });

  it("refresh refused (401) -> reauthRequired; data and outbox stay; further calls fail fast without the network", async () => {
    const { session, dbs, store, calls } = setup((url) => (url.endsWith("/login") ? json(200, auth("u1")) : url.endsWith("/refresh") ? json(401, { success: false, error: "no" }) : json(401, { success: false, error: "expired" })));
    const db = await session.login("a", "b");
    createWorkout(testCtx(db, "u1"));
    await expect(session.api.get("/api/x")).rejects.toBeInstanceOf(ReauthRequiredError);
    expect(session.getState()).toMatchObject({ status: "reauthRequired", user: { id: "u1" } });
    const before = calls.length;
    await expect(session.api.post("/api/sync/push", {})).rejects.toBeInstanceOf(ReauthRequiredError);
    expect(calls.length).toBe(before);
    expect(dbs.has("u1")).toBe(true);
    expect(store.data.has("gymgate.refreshToken")).toBe(false);
  });

  it("network errors, timeouts and 5xx never change the session state", async () => {
    let mode: "net" | "5xx" | "ok" = "net";
    const { session } = setup((url) => {
      if (url.endsWith("/login")) return json(200, auth("u1"));
      if (url.endsWith("/refresh")) {
        if (mode === "net") throw new TypeError("Network request failed");
        return mode === "5xx" ? json(503, { success: false, error: "busy" }) : json(200, auth("u1", 2));
      }
      return json(401, { success: false, error: "expired" });
    });
    await session.login("a", "b");
    await expect(session.api.get("/api/x")).rejects.toBeInstanceOf(NetworkError);
    expect(session.getState().status).toBe("active");
    mode = "5xx";
    await expect(session.api.get("/api/x")).rejects.toBeInstanceOf(HttpError);
    expect(session.getState().status).toBe("active");
  });

  it("restore() opens the local data without the network and reports reauthRequired after a refused refresh", async () => {
    const { session, store, dbs, calls } = setup((url) => (url.endsWith("/login") ? json(200, auth("u1")) : json(401, { success: false, error: "x" })));
    await session.login("a", "b");
    saveProfile(dbs.get("u1")!, user("u1"));
    const again = createSession({ baseUrl: "http://x.test", store, openDb: (id) => dbs.get(id)!, deleteDb: () => undefined, newId: () => "n", fetchImpl: (() => { throw new Error("offline"); }) as never });
    expect(await again.restore()).toMatchObject({ status: "active", user: { id: "u1" } });
    expect(calls).toHaveLength(1);
    await expect(again.api.get("/x")).rejects.toThrow(); // lazy refresh fails offline: still active
    expect(again.getState().status).toBe("active");
    const refused = createSession({ baseUrl: "http://x.test", store, openDb: (id) => dbs.get(id)!, deleteDb: () => undefined, newId: () => "n", fetchImpl: (async () => json(401, { success: false, error: "x" })) as never });
    await refused.restore();
    await expect(refused.api.get("/x")).rejects.toBeInstanceOf(ReauthRequiredError);
    const afterRestart = createSession({ baseUrl: "http://x.test", store, openDb: (id) => dbs.get(id)!, deleteDb: () => undefined, newId: () => "n" });
    expect((await afterRestart.restore()).status).toBe("reauthRequired");
  });

  it("re-login to the same account resumes; another account with unsent changes needs an explicit decision", async () => {
    let who = "u1";
    const { session, dbs, store } = setup((url) => (url.includes("/login") ? json(200, auth(who)) : json(200, { success: true, data: null })));
    const db = await session.login("a", "b");
    createWorkout(testCtx(db, "u1"));
    await session.logout({ pendingChanges: "keep" });
    expect(session.getState().status).toBe("signedOut");
    expect(dbs.has("u1")).toBe(true);
    who = "u2";
    await expect(session.login("c", "d")).rejects.toBeInstanceOf(PendingChangesError);
    expect(session.getState().status).toBe("signedOut");
    expect(store.data.has("gymgate.refreshToken")).toBe(false);
    await session.login("c", "d", { allowAccountSwitch: true });
    expect(session.getState().user?.id).toBe("u2");
    expect([...dbs.keys()].sort()).toEqual(["u1", "u2"]);
    who = "u1";
    await session.logout();
    expect(await session.login("a", "b")).toBe(db); // the same local database again
  });

  it("after a 'keep my data' logout an app restart stays signed out and opens no database", async () => {
    const { session, dbs, store } = setup((url) => (url.includes("/login") ? json(200, auth("u1")) : json(200, { success: true, data: null })));
    const db = await session.login("a", "b");
    createWorkout(testCtx(db, "u1"));
    await session.logout({ pendingChanges: "keep" });
    const opened: string[] = [];
    const restarted = createSession({ baseUrl: "http://x.test", store, openDb: (id) => (opened.push(id), dbs.get(id)!), deleteDb: () => undefined, newId: () => "n" });
    expect((await restarted.restore()).status).toBe("signedOut");
    expect(opened).toEqual([]);
    expect(restarted.getDb()).toBeNull();
  });

  it("logout: pending changes need a choice; revokes the refresh token; empty outbox deletes the database", async () => {
    const { session, dbs, calls, store } = setup((url) => (url.endsWith("/login") ? json(200, auth("u1")) : json(200, { success: true, data: null })));
    const db = await session.login("a", "b");
    createWorkout(testCtx(db, "u1"));
    await expect(session.logout()).rejects.toBeInstanceOf(PendingChangesError);
    expect(session.getState().status).toBe("active");
    await session.logout({ pendingChanges: "discard" });
    expect(calls.at(-1)).toMatchObject({ url: "/api/auth/mobile/logout", body: { refreshToken: "ref1" } });
    expect(dbs.has("u1")).toBe(false);
    expect(store.data.has("gymgate.userId")).toBe(false);
    expect(store.data.get("gymgate.deviceId")).toBe("dev-1");
  });

  it("logout still succeeds when revoking fails (best effort)", async () => {
    const { session } = setup((url) => {
      if (url.endsWith("/login")) return json(200, auth("u1"));
      throw new TypeError("offline");
    });
    await session.login("a", "b");
    await session.logout();
    expect(session.getState().status).toBe("signedOut");
  });

  it("deleteAccount sends the password; success removes database and tokens, 403 changes nothing", async () => {
    let wrong = true;
    const { session, dbs, store, calls } = setup((url) => {
      if (url.endsWith("/login")) return json(200, auth("u1"));
      return wrong ? json(403, { success: false, error: "Nieprawidłowe hasło" }) : json(200, { success: true, data: null });
    });
    await session.login("a", "b");
    await expect(session.deleteAccount("bad")).rejects.toMatchObject({ status: 403 });
    expect(session.getState().status).toBe("active");
    wrong = false;
    await session.deleteAccount("pw");
    expect(calls.at(-1)).toMatchObject({ url: "/api/auth/account", body: { password: "pw" } });
    expect(dbs.has("u1")).toBe(false);
    expect(store.data.has("gymgate.refreshToken")).toBe(false);
    expect(session.getState().status).toBe("signedOut");
  });
});
