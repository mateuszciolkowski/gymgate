import { HttpError, NetworkError, ReauthRequiredError } from "../api/errors";
import { createWorkout } from "../db/repositories";
import { setupWorld } from "../db/testing";
import { createSyncEngine, retryDelayMs } from "./engine";
import { pendingCount } from "./outbox";
import { emptyPull, fakeApi, ok, pushData } from "./testApi";

const now = () => "2026-01-01T12:00:00.000Z";

/** Server that accepts every push and serves an empty pull. */
const happy = (c: { path: string; body?: unknown }) =>
  c.path.includes("push") ? pushData((c.body as { ops: Array<{ opId: string }> }).ops.map((o) => ok(o.opId))) : emptyPull();

beforeEach(() => jest.useFakeTimers());
afterEach(() => jest.useRealTimers());

describe("retryDelayMs", () => {
  it("is 5 s, 15 s, 60 s, then every 5 minutes", () => {
    expect([0, 1, 2, 3, 4, 20].map(retryDelayMs)).toEqual([5_000, 15_000, 60_000, 300_000, 300_000, 300_000]);
  });
});

describe("sync engine", () => {
  it("one cycle pushes then pulls and updates the observable state", async () => {
    const { db, ctx } = setupWorld();
    createWorkout(ctx);
    const api = fakeApi(happy);
    const engine = createSyncEngine({ db, api, deviceId: "d", now });
    expect(engine.getState()).toMatchObject({ status: "idle", pending: 1 });
    const states: string[] = [];
    engine.subscribe(() => states.push(engine.getState().status));
    await engine.syncNow();
    expect(api.calls.map((c) => c.method + " " + c.path)).toEqual(["post /api/sync/push", "get /api/sync/pull"]);
    expect(engine.getState()).toMatchObject({ status: "idle", pending: 0, lastSuccessAt: now(), lastError: null });
    expect(states[0]).toBe("syncing");
  });

  it("is single-flight: concurrent calls share one cycle, a call during a cycle triggers exactly one more", async () => {
    const { db } = setupWorld();
    let release: () => void = () => undefined;
    let pulls = 0;
    const api = fakeApi(async (c) => {
      if (c.path.includes("pull")) {
        pulls++;
        if (pulls === 1) await new Promise<void>((r) => (release = r));
      }
      return happy(c);
    });
    const engine = createSyncEngine({ db, api, deviceId: "d", now });
    const a = engine.syncNow();
    const b = engine.syncNow();
    expect(b).toBe(a);
    await jest.advanceTimersByTimeAsync(0);
    expect(pulls).toBe(1);
    release();
    await a;
    expect(pulls).toBe(2);
  });

  it("debounces local writes by 2 s", async () => {
    const { db } = setupWorld();
    const api = fakeApi(happy);
    const engine = createSyncEngine({ db, api, deviceId: "d", now });
    engine.requestSync("local-write");
    await jest.advanceTimersByTimeAsync(1_500);
    engine.requestSync("local-write");
    await jest.advanceTimersByTimeAsync(1_500);
    expect(api.calls).toHaveLength(0);
    await jest.advanceTimersByTimeAsync(600);
    expect(api.calls.filter((c) => c.path.includes("pull"))).toHaveLength(1);
  });

  it("retries after 5 s, 15 s, 60 s, 5 min; success resets; offline state; network reason resets at once", async () => {
    const { db, ctx } = setupWorld();
    createWorkout(ctx);
    let online = false;
    const api = fakeApi((c) => {
      if (!online) throw new NetworkError("down");
      return happy(c);
    });
    const engine = createSyncEngine({ db, api, deviceId: "d", now });
    await engine.syncNow();
    expect(engine.getState()).toMatchObject({ status: "offline", pending: 1 });
    const attemptsAfter = async (ms: number) => {
      await jest.advanceTimersByTimeAsync(ms);
      return api.calls.length;
    };
    expect(await attemptsAfter(4_999)).toBe(1);
    expect(await attemptsAfter(1)).toBe(2); // +5 s
    expect(await attemptsAfter(14_999)).toBe(2);
    expect(await attemptsAfter(1)).toBe(3); // +15 s
    expect(await attemptsAfter(59_999)).toBe(3);
    expect(await attemptsAfter(1)).toBe(4); // +60 s
    expect(await attemptsAfter(299_999)).toBe(4);
    expect(await attemptsAfter(1)).toBe(5); // +5 min
    // local writes during a backoff do not add attempts
    engine.requestSync("local-write");
    expect(await attemptsAfter(2_100)).toBe(5);
    online = true;
    engine.requestSync("network");
    await jest.advanceTimersByTimeAsync(0);
    expect(engine.getState()).toMatchObject({ status: "idle", pending: 0 });
    // after success the schedule starts over at 5 s
    online = false;
    engine.requestSync("manual");
    await jest.advanceTimersByTimeAsync(0);
    const n = api.calls.length;
    await jest.advanceTimersByTimeAsync(5_000);
    expect(api.calls.length).toBe(n + 1);
  });

  it("a 5xx is an error state with retry; the batch stays in the outbox", async () => {
    const { db, ctx } = setupWorld();
    createWorkout(ctx);
    const engine = createSyncEngine({ db, api: fakeApi(() => { throw new HttpError(503, "busy", null); }), deviceId: "d", now });
    await engine.syncNow();
    expect(engine.getState()).toMatchObject({ status: "error", lastError: "busy" });
    expect(pendingCount(db)).toBe(1);
  });

  it("ReauthRequiredError pauses without retries; isPaused skips cycles", async () => {
    const { db } = setupWorld();
    const api = fakeApi(() => { throw new ReauthRequiredError(); });
    const engine = createSyncEngine({ db, api, deviceId: "d", now });
    await engine.syncNow();
    expect(engine.getState().status).toBe("paused");
    await jest.advanceTimersByTimeAsync(600_000);
    expect(api.calls).toHaveLength(1);
    const api2 = fakeApi(happy);
    const paused = createSyncEngine({ db, api: api2, deviceId: "d", now, isPaused: () => true });
    await paused.syncNow();
    expect(api2.calls).toHaveLength(0);
    expect(paused.getState().status).toBe("paused");
  });

  it("start() runs immediately, then every 2 minutes, wires event sources; stop() cancels everything", async () => {
    const { db } = setupWorld();
    const api = fakeApi(happy);
    let trigger: (r: "foreground") => void = () => undefined;
    let unsubscribed = false;
    const engine = createSyncEngine({ db, api, deviceId: "d", now, sources: [(t) => { trigger = t; return () => { unsubscribed = true; }; }] });
    engine.start();
    await jest.advanceTimersByTimeAsync(0);
    const pulls = () => api.calls.filter((c) => c.path.includes("pull")).length;
    expect(pulls()).toBe(1);
    await jest.advanceTimersByTimeAsync(120_000);
    expect(pulls()).toBe(2);
    trigger("foreground");
    await jest.advanceTimersByTimeAsync(0);
    expect(pulls()).toBe(3);
    engine.stop();
    expect(unsubscribed).toBe(true);
    await jest.advanceTimersByTimeAsync(600_000);
    expect(pulls()).toBe(3);
  });

  it("resync() sends the outbox first and then runs a full snapshot", async () => {
    const { db, ctx } = setupWorld();
    createWorkout(ctx);
    const api = fakeApi(happy);
    const engine = createSyncEngine({ db, api, deviceId: "d", now });
    await engine.syncNow(); // stores a cursor
    api.calls.length = 0;
    createWorkout(ctx);
    await engine.resync();
    expect(api.calls.map((c) => c.path)).toEqual(["/api/sync/push", "/api/sync/pull"]);
  });
});
