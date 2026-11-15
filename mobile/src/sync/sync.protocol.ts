/**
 * MIGRACJA 6.8 protocol scenarios: real client stack against the LOCAL backend (npm run test:protocol).
 * Every test registers its own user, so runs are independent. The "PWA" uses the old endpoints.
 */
import { eq } from "drizzle-orm";
import { getAllStats, addItem, addSet, completeWorkout, createExercise, createPlan, createWorkout, deleteSet, getActiveWorkoutId, getPlan, updateSet, updateWorkout } from "../db/repositories";
import { outbox, plans, profile, workoutSets, workouts } from "../db/schema";
import { toHundredths } from "../domain/weight";
import { listOpenIssues, groupIssues, retryIssue, discardIssue } from "./issues";
import { pendingCount } from "./outbox";
import { PendingChangesError } from "../session/session";
import { localData, openDevice, pwaLogin, registerDevice, sleep, stopAll, type Device, type PwaClient } from "./protocolHarness";

afterEach(stopAll);

interface ApiSet { id: string; weight: string; repetitions: number; setNumber: number }
interface ApiItem { id: string; exerciseId: string; notes: string | null; sets: ApiSet[] }
interface ApiWorkout { id: string; status: string; workoutName: string | null; createdAt: string; updatedAt: string; workoutDate: string; durationSeconds: number | null; items: ApiItem[] }

const pwaFor = (d: Device) => pwaLogin(d.creds);
const pwaExercise = async (pwa: PwaClient, name: string) =>
  (await pwa.req<{ id: string }>("POST", "/api/exercises", { name, muscleGroups: ["CHEST"] })).id;
const serverWorkouts = (pwa: PwaClient) => pwa.get<ApiWorkout[]>("/api/workouts");

/** A synced device whose user already has one exercise made in the PWA. */
async function start() {
  const d = await registerDevice();
  const pwa = await pwaFor(d);
  const exerciseId = await pwaExercise(pwa, `Wyciskanie ${Date.now()}`);
  await d.sync();
  expect(d.engine.getState().status).toBe("idle");
  return { d, pwa, exerciseId };
}

describe("6.8 protocol scenarios", () => {
  it("full workout offline, then sync: visible in the PWA with the client's times and duration", async () => {
    const { d, pwa, exerciseId } = await start();
    d.net.offline = true;
    const startMs = Date.now() - 2 * 3_600_000;
    d.clock.shift = -2 * 3_600_000;
    const w = createWorkout(d.ctx, { workoutName: "Offline push" });
    const item = addItem(d.ctx, w.id, exerciseId);
    d.clock.shift += 10 * 60_000;
    addSet(d.ctx, item.id, { weight: "60", repetitions: 8 });
    addSet(d.ctx, item.id, { weight: "62.5", repetitions: 6 });
    d.clock.shift += 35 * 60_000;
    completeWorkout(d.ctx, w.id, 2700);
    await d.sync();
    expect(d.engine.getState()).toMatchObject({ status: "offline" });
    expect(pendingCount(d.db)).toBeGreaterThan(0);
    expect(await serverWorkouts(pwa)).toHaveLength(0);

    d.net.offline = false;
    d.engine.requestSync("network");
    await d.sync();
    expect(d.engine.getState()).toMatchObject({ status: "idle", pending: 0 });
    const [server] = await serverWorkouts(pwa);
    expect(server).toMatchObject({ id: w.id, status: "COMPLETED", workoutName: "Offline push", durationSeconds: 2700 });
    const near = (iso: string, ms: number) => Math.abs(new Date(iso).getTime() - ms) < 5_000; // not the time the batch arrived
    expect(near(server!.createdAt, startMs)).toBe(true);
    expect(near(server!.workoutDate, startMs)).toBe(true);
    expect(near(server!.updatedAt, startMs + 45 * 60_000)).toBe(true);
    expect(server!.items[0]!.sets.map((s) => [s.setNumber, Number(s.weight), s.repetitions])).toEqual([[1, 60, 8], [2, 62.5, 6]]);
    expect((await pwa.get<{ activeWorkoutId: string | null }>("/api/workouts/active")).activeWorkoutId).toBeNull();
  });

  it("kill mid-workout: the reopened database continues the workout and syncs everything", async () => {
    const { d, pwa, exerciseId } = await start();
    d.net.offline = true;
    const w = createWorkout(d.ctx, { workoutName: "Przerwany" });
    const item = addItem(d.ctx, w.id, exerciseId);
    addSet(d.ctx, item.id, { weight: "50", repetitions: 10 });
    const before = pendingCount(d.db);

    const d2 = await d.restart(); // app killed, restarted from the same file and stored session
    expect(d2.session.getState().status).toBe("active");
    expect(getActiveWorkoutId(d2.db)).toBe(w.id);
    expect(pendingCount(d2.db)).toBe(before);
    addSet(d2.ctx, item.id, { weight: "55", repetitions: 8 });
    completeWorkout(d2.ctx, w.id, 1800);
    await d2.sync();
    const [server] = await serverWorkouts(pwa);
    expect(server!.items[0]!.sets.map((s) => Number(s.weight))).toEqual([50, 55]);
    expect(server!.status).toBe("COMPLETED");
  });

  it("response lost after the server committed: the retry creates no duplicates", async () => {
    const { d, pwa, exerciseId } = await start();
    const w = createWorkout(d.ctx);
    const item = addItem(d.ctx, w.id, exerciseId);
    addSet(d.ctx, item.id, { weight: "40", repetitions: 12 });
    const opIds = d.db.select().from(outbox).all().map((o) => o.opId);
    d.net.dropNextPushResponse = true;
    await d.sync();
    expect(d.engine.getState().status).toBe("offline");
    expect(pendingCount(d.db)).toBe(opIds.length); // client does not know
    expect(await serverWorkouts(pwa)).toHaveLength(1); // server does
    d.engine.requestSync("network");
    await d.sync();
    expect(d.engine.getState()).toMatchObject({ status: "idle", pending: 0, openIssues: 0 });
    const all = await serverWorkouts(pwa);
    expect(all).toHaveLength(1);
    expect(all[0]!.items).toHaveLength(1);
    expect(all[0]!.items[0]!.sets).toHaveLength(1);
  });

  it("the same batch sent twice: second answer is duplicate for every op, nothing changes", async () => {
    const { d, pwa, exerciseId } = await start();
    const w = createWorkout(d.ctx);
    addSet(d.ctx, addItem(d.ctx, w.id, exerciseId).id, { weight: "40", repetitions: 5 });
    const ops = d.db.select().from(outbox).all().map((o) => JSON.parse(o.payload) as unknown);
    const send = () => d.session.api.post<{ data: { results: Array<{ status: string }> } }>("/api/sync/push", { deviceId: "dev-x", ops });
    expect((await send()).data.results.map((r) => r.status)).toEqual(ops.map(() => "applied"));
    expect((await send()).data.results.map((r) => r.status)).toEqual(ops.map(() => "duplicate"));
    const [server] = await serverWorkouts(pwa);
    expect(server!.items[0]!.sets).toHaveLength(1);
  });

  it("same record edited in the app and in the PWA: the newer change wins in both directions", async () => {
    const { d, pwa } = await start();
    const created = await pwa.req<{ id: string }>("POST", "/api/workouts", { workoutName: "start" });
    await d.sync();
    const id = created.id;
    const nameOnServer = async () => (await pwa.get<ApiWorkout>(`/api/workouts/${id}`)).workoutName;
    const nameLocal = () => d.db.select().from(workouts).where(eq(workouts.id, id)).get()?.workoutName;

    // PWA first, app later: the app wins.
    await pwa.req("PATCH", `/api/workouts/${id}`, { workoutName: "PWA 1" });
    await sleep(30);
    updateWorkout(d.ctx, id, { workoutName: "App 1" });
    await d.sync();
    expect(await nameOnServer()).toBe("App 1");
    expect(nameLocal()).toBe("App 1");

    // App first (offline), PWA later: the PWA wins, the app takes the server's version back.
    d.net.offline = true;
    updateWorkout(d.ctx, id, { workoutName: "App 2" });
    await sleep(30);
    await pwa.req("PATCH", `/api/workouts/${id}`, { workoutName: "PWA 2" });
    d.net.offline = false;
    d.engine.requestSync("network");
    await d.sync();
    expect(await nameOnServer()).toBe("PWA 2");
    expect(nameLocal()).toBe("PWA 2");
    expect(d.engine.getState().openIssues).toBe(0);
  });

  it("workout started offline while the PWA has an active one: both are kept, the later start is active, no set is lost", async () => {
    const { d, pwa, exerciseId } = await start();
    d.net.offline = true;
    const pwaWorkout = await pwa.req<{ id: string }>("POST", "/api/workouts", { workoutName: "PWA aktywny" });
    await sleep(30);
    const mine = createWorkout(d.ctx, { workoutName: "App offline" }); // started after the PWA one
    const item = addItem(d.ctx, mine.id, exerciseId);
    addSet(d.ctx, item.id, { weight: "70", repetitions: 5 });
    d.net.offline = false;
    await d.sync();
    const all = await serverWorkouts(pwa);
    expect(all.map((w) => w.id).sort()).toEqual([pwaWorkout.id, mine.id].sort());
    expect(all.every((w) => w.status === "DRAFT")).toBe(true);
    expect(all.find((w) => w.id === mine.id)!.items[0]!.sets).toHaveLength(1);
    expect((await pwa.get<{ activeWorkoutId: string }>("/api/workouts/active")).activeWorkoutId).toBe(mine.id);
    expect(getActiveWorkoutId(d.db)).toBe(mine.id);
    expect(d.db.select().from(workouts).all()).toHaveLength(2);

    // reverse: the app's workout started earlier than the PWA one that was created meanwhile
    d.net.offline = true;
    d.clock.shift = -600_000;
    const older = createWorkout(d.ctx, { workoutName: "Starszy z apki" });
    d.clock.shift = 0;
    d.net.offline = false;
    await d.sync();
    expect(await serverWorkouts(pwa)).toHaveLength(3);
    expect(older.id).toBeTruthy();
    expect((await pwa.get<{ activeWorkoutId: string }>("/api/workouts/active")).activeWorkoutId).toBe(mine.id);
  });

  it("long offline period: hundreds of queued ops go out in several batches of at most 100", async () => {
    const { d, pwa } = await start();
    d.net.offline = true;
    const w = createWorkout(d.ctx, { workoutName: "Maraton" });
    for (let i = 0; i < 25; i++) {
      const ex = createExercise(d.ctx, { name: `Ćwiczenie ${i} ${Date.now()}`, muscleGroups: ["CHEST"] });
      const item = addItem(d.ctx, w.id, ex.id);
      for (let s = 0; s < 8; s++) addSet(d.ctx, item.id, { weight: String(20 + s), repetitions: 5 + s });
    }
    const queued = pendingCount(d.db);
    expect(queued).toBeGreaterThan(250);
    await d.sync();
    expect(pendingCount(d.db)).toBe(queued);
    d.net.offline = false;
    d.engine.requestSync("network");
    await d.sync();
    expect(d.net.pushRequests).toBe(Math.ceil(queued / 100));
    expect(d.engine.getState()).toMatchObject({ status: "idle", pending: 0, openIssues: 0 });
    const [server] = await serverWorkouts(pwa);
    expect(server!.items).toHaveLength(25);
    expect(server!.items.every((i) => i.sets.length === 8)).toBe(true);
  });

  it("session expired while offline: work continues locally, re-login to the same account sends the queue; another account is refused", async () => {
    const { d, pwa, exerciseId } = await start();
    d.net.offline = true;
    const w = createWorkout(d.ctx, { workoutName: "Po wygaśnięciu" });
    addSet(d.ctx, addItem(d.ctx, w.id, exerciseId).id, { weight: "45", repetitions: 9 });
    const queued = pendingCount(d.db);
    // the refresh token is revoked on the server and the stored access token is garbage
    const refreshToken = d.store.data.get("gymgate.refreshToken");
    await fetch(`${process.env.PROTOCOL_API ?? "http://localhost:3100"}/api/auth/mobile/logout`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ refreshToken }) });
    d.store.data.set("gymgate.accessToken", "garbage");
    const deviceId = await d.session.deviceId();

    const d2 = await d.restart();
    expect(d2.session.getState().status).toBe("active"); // offline start never logs out
    await d2.sync();
    expect(d2.session.getState().status).toBe("reauthRequired");
    expect(d2.engine.getState().status).toBe("paused");
    expect(pendingCount(d2.db)).toBe(queued);
    expect(getActiveWorkoutId(d2.db)).toBe(w.id);

    await expect(openDevice({ creds: { email: `other-${Date.now()}@test.local`, password: "Passw0rd!" }, mode: "register", store: d2.store, file: d2.file })).rejects.toBeInstanceOf(PendingChangesError);

    await d2.session.login(d2.creds.email, d2.creds.password);
    expect(await d2.session.deviceId()).toBe(deviceId);
    await d2.sync();
    expect(d2.engine.getState()).toMatchObject({ status: "idle", pending: 0 });
    const [server] = await serverWorkouts(pwa);
    expect(server).toMatchObject({ id: w.id, workoutName: "Po wygaśnięciu" });
    expect(server!.items[0]!.sets).toHaveLength(1);
  });

  it("plan changes made offline and rejected by the server: visible issue, the rest of the queue continues", async () => {
    const { d, pwa, exerciseId } = await start();
    // PWA makes a plan the app has not seen yet
    await pwa.req("POST", "/api/plans", { name: "Zajęta nazwa", exerciseIds: [exerciseId] });
    d.net.offline = true;
    const clash = createPlan(d.ctx, { name: "Zajęta nazwa", exerciseIds: [exerciseId], isPublic: false });
    // public plan with a private exercise: the local check passes only for stale state, so tamper the queued op
    const secret = createPlan(d.ctx, { name: "Publiczny sekret", exerciseIds: [exerciseId], isPublic: false });
    const secretOp = d.db.select().from(outbox).all().find((o) => o.entityId === secret.id)!;
    d.db.update(outbox).set({ payload: JSON.stringify({ ...JSON.parse(secretOp.payload), isPublic: true }) }).where(eq(outbox.opId, secretOp.opId)).run();
    const w = createWorkout(d.ctx, { workoutName: "Po odrzuceniach" });
    d.net.offline = false;
    await d.sync();

    expect(d.engine.getState()).toMatchObject({ status: "idle", pending: 0, openIssues: 2 });
    const issues = listOpenIssues(d.db);
    expect(issues.map((i) => i.entityId).sort()).toEqual([clash.id, secret.id].sort());
    expect(issues.every((i) => i.code && i.error)).toBe(true);
    expect(groupIssues(issues).filter((g) => g.kind === "single")).toHaveLength(2);
    expect((await serverWorkouts(pwa)).map((x) => x.id)).toEqual([w.id]); // later op went through
    expect(getPlan(d.db, clash.id)).not.toBeNull(); // local plan stays for fixing

    // fix the clash: retry with another name; discard the other one
    const clashIssue = issues.find((i) => i.entityId === clash.id)!;
    d.db.update(plans).set({ name: "Wolna nazwa" }).where(eq(plans.id, clash.id)).run(); // the fix form edits the local row
    retryIssue(d.ctx, clashIssue.id, { name: "Wolna nazwa" });
    discardIssue(d.db, issues.find((i) => i.entityId === secret.id)!.id);
    await d.sync();
    expect(d.engine.getState()).toMatchObject({ pending: 0, openIssues: 0 });
    const plansOnServer = await pwa.get<Array<{ id: string; name: string }>>("/api/plans?tab=mine");
    expect(plansOnServer.map((p) => p.name).sort()).toEqual(["Wolna nazwa", "Zajęta nazwa"]);
    expect(getPlan(d.db, secret.id)).toBeNull();
  });

  it("record deleted in the PWA while the app has queued ops for it: grouped notice, no stray data", async () => {
    const { d, pwa, exerciseId } = await start();
    const w = await pwa.req<{ id: string }>("POST", "/api/workouts", { workoutName: "Do usunięcia" });
    const item = await pwa.req<{ id: string }>("POST", `/api/workouts/${w.id}/exercises`, { exerciseId });
    await d.sync();
    expect(d.db.select().from(workouts).all()).toHaveLength(1);
    await pwa.req("DELETE", `/api/workouts/${w.id}`);
    d.net.offline = true;
    addSet(d.ctx, item.id, { weight: "30", repetitions: 10 });
    addSet(d.ctx, item.id, { weight: "32", repetitions: 8 });
    updateWorkout(d.ctx, w.id, { workoutName: "Po usunięciu" });
    d.net.offline = false;
    await d.sync();
    expect(d.engine.getState()).toMatchObject({ status: "idle", pending: 0, openIssues: 3 });
    const groups = groupIssues(listOpenIssues(d.db));
    expect(groups).toHaveLength(1);
    expect(groups[0]).toMatchObject({ kind: "parentDeleted", subject: "workout" });
    expect(groups[0]!.message).toBe("Trening został usunięty na innym urządzeniu; 3 niewysłane zmiany pominięto");
    expect(d.db.select().from(workouts).all()).toHaveLength(0);
    expect(d.db.select().from(workoutSets).all()).toHaveLength(0);
    expect(await serverWorkouts(pwa)).toHaveLength(0);
  });

  it("two devices of one account converge, including edits and deletes", async () => {
    const { d: a, pwa, exerciseId } = await start();
    const b = await openDevice({ creds: a.creds, mode: "login" });
    await b.sync();
    expect(localData(b.db).exercises).toHaveLength(localData(a.db).exercises.length);

    const w = createWorkout(a.ctx, { workoutName: "Z A" });
    const item = addItem(a.ctx, w.id, exerciseId);
    const s1 = addSet(a.ctx, item.id, { weight: "80", repetitions: 5 });
    addSet(a.ctx, item.id, { weight: "82.5", repetitions: 4 });
    await a.sync();
    await b.sync();
    expect(localData(b.db)).toEqual(localData(a.db));
    expect(getActiveWorkoutId(b.db)).toBe(w.id);

    updateSet(b.ctx, s1.id, { weight: "85" });
    addSet(b.ctx, item.id, { weight: "70", repetitions: 12 });
    createPlan(b.ctx, { name: "Plan z B", exerciseIds: [exerciseId], isPublic: false });
    await b.sync();
    await a.sync();
    expect(localData(a.db)).toEqual(localData(b.db));

    deleteSet(a.ctx, s1.id);
    completeWorkout(a.ctx, w.id, 600);
    await a.sync();
    await b.sync();
    expect(localData(b.db)).toEqual(localData(a.db));
    expect(localData(b.db).sets).toHaveLength(2);
    expect(getActiveWorkoutId(b.db)).toBeNull();
    const [server] = await serverWorkouts(pwa);
    expect(server!.items[0]!.sets.map((s) => s.id).sort()).toEqual(localData(a.db).sets.map((s) => s.id).sort());
  });

  it("local statistics equal the server's after sync (own data)", async () => {
    const { d, pwa } = await start();
    const bench = createExercise(d.ctx, { name: `Bench ${Date.now()}`, muscleGroups: ["CHEST"] });
    const squat = createExercise(d.ctx, { name: `Squat ${Date.now()}`, muscleGroups: ["QUADS"] });
    const day = 86_400_000;
    const sessions = [
      { ago: 9, sets: [[bench.id, "60", 8], [bench.id, "62.5", 6], [squat.id, "100", 5]] },
      { ago: 6, sets: [[bench.id, "65", 5], [squat.id, "105", 5], [squat.id, "105", 4]] },
      { ago: 2, sets: [[bench.id, "62.5", 8], [bench.id, "65", 5]] },
    ] as const;
    for (const s of sessions) {
      d.clock.shift = -s.ago * day;
      const w = createWorkout(d.ctx, { workoutDate: new Date(Date.now() + d.clock.shift).toISOString() });
      const items = new Map<string, string>();
      for (const [ex, weight, reps] of s.sets) {
        if (!items.has(ex)) items.set(ex, addItem(d.ctx, w.id, ex).id);
        addSet(d.ctx, items.get(ex)!, { weight, repetitions: reps });
      }
      d.clock.shift += 3_600_000;
      completeWorkout(d.ctx, w.id, 3600);
    }
    d.clock.shift = 0;
    await d.sync();
    expect(d.engine.getState()).toMatchObject({ pending: 0, openIssues: 0 });
    await compareStats(d, pwa);
  });

  it("local statistics equal the server's for the seeded user (pull only)", async () => {
    let seeded: Device;
    try {
      seeded = await openDevice({ creds: { email: "test@gymgate.com", password: "Test1234!" }, mode: "login" });
    } catch {
      console.warn("seeded user test@gymgate.com not available: skipping");
      return;
    }
    await seeded.sync();
    expect(seeded.engine.getState().status).toBe("idle");
    expect(seeded.db.select().from(workouts).all().length).toBeGreaterThan(0);
    expect(seeded.db.select().from(profile).get()?.email).toBe("test@gymgate.com");
    await compareStats(seeded, await pwaLogin(seeded.creds));
  });
});

async function compareStats(d: Device, pwa: PwaClient) {
  const server = await pwa.get<Array<Record<string, string | number | null>>>("/api/workouts/stats/all");
  const local = getAllStats(d.db);
  expect(local.map((s) => s.exerciseId).sort()).toEqual(server.map((s) => s.exerciseId as string).sort());
  expect(local.length).toBeGreaterThan(0);
  for (const s of server) {
    const l = local.find((x) => x.exerciseId === s.exerciseId)!;
    expect({
      maxWeight: toHundredths(l.maxWeight),
      lastWeight: toHundredths(l.lastWeight),
      lastReps: l.lastReps,
      totalWorkouts: l.totalWorkouts,
      lastNote: l.lastNote,
      lastWorkoutDate: new Date(l.lastWorkoutDate).getTime(),
    }).toEqual({
      maxWeight: toHundredths(s.maxWeight as string),
      lastWeight: toHundredths(s.lastWeight as string),
      lastReps: s.lastReps,
      totalWorkouts: s.totalWorkouts,
      lastNote: s.lastNote ?? null,
      lastWorkoutDate: new Date(s.lastWorkoutDate as string).getTime(),
    });
  }
}
