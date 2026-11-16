import type { Workout } from "@/domain/types";
import { STALE_WORKOUT_MS } from "@/domain/workoutTimer";
import { reconcile, staleDateOf, workoutToActivity, type ActivityApi, type ActivityProps, type Reconciler } from "./content";

const at = (m: number) => new Date(Date.UTC(2026, 0, 1, 10, m)).toISOString();
const set = (n: number, weight: string, reps: number, m: number) => ({ id: `s${n}`, itemId: "i", setNumber: n, weight, repetitions: reps, createdAt: at(m), updatedAt: at(m) });
const item = (id: string, name: string, order: number, m: number, sets: ReturnType<typeof set>[] = []) => ({
  id, workoutId: "w", exerciseId: id, orderInWorkout: order, createdAt: at(m), updatedAt: at(m), exercise: { id, name, muscleGroups: [] }, sets,
});
const workout = (over: Partial<Workout> = {}): Workout => ({
  id: "w", userId: "u", workoutDate: at(0), status: "DRAFT", workoutName: "Push", createdAt: at(0), updatedAt: at(0), items: [], ...over,
});

describe("workoutToActivity", () => {
  it("is null without a DRAFT workout (completed, deleted or none)", () => {
    expect(workoutToActivity(null, 0, "#fff")).toBeNull();
    expect(workoutToActivity(workout({ status: "COMPLETED" }), 0, "#fff")).toBeNull();
  });

  it("starts empty with the default name and no exercise", () => {
    const p = workoutToActivity(workout({ workoutName: " " }), 0, "#abc")!;
    expect(p).toMatchObject({ name: "Trening", exercise: null, sets: 0, lastSet: null, accent: "#abc", startedAt: Date.parse(at(0)) });
  });

  it("shows the most recently touched exercise with its set count and last set", () => {
    const w = workout({
      items: [item("a", "Przysiad", 0, 1, [set(1, "100.00", 5, 2)]), item("b", "Wyciskanie", 1, 3, [set(1, "60", 8, 4), set(2, "62.5", 6, 9)])],
    });
    expect(workoutToActivity(w, 0, "#fff")).toMatchObject({ exercise: "Wyciskanie", sets: 2, lastSet: "62.5 kg × 6", lastActivityAt: Date.parse(at(9)) });
  });

  it("switches back to an older exercise when a set is edited there", () => {
    const w = workout({ items: [item("a", "Przysiad", 0, 1, [set(1, "100", 5, 20)]), item("b", "Wyciskanie", 1, 3, [set(1, "60", 8, 4)])] });
    expect(workoutToActivity(w, 0, "#fff")!.exercise).toBe("Przysiad");
  });

  it("shifts timestamps by the server clock offset so the system timer matches the app timer", () => {
    const p = workoutToActivity(workout(), 5000, "#fff")!;
    expect(p.startedAt).toBe(Date.parse(at(0)) - 5000);
  });

  it("goes stale 2 h after the last activity (P7)", () => {
    const p = workoutToActivity(workout({ items: [item("a", "X", 0, 30)] }), 0, "#fff", Date.parse(at(31)))!;
    expect(p.abandoned).toBe(false);
    expect(staleDateOf(p)!.getTime()).toBe(Date.parse(at(30)) + STALE_WORKOUT_MS);
  });

  it("is flagged abandoned (no stale date) when the app sends it more than 2 h after the last activity (P7)", () => {
    const p = workoutToActivity(workout({ items: [item("a", "X", 0, 30)] }), 0, "#fff", Date.parse(at(30)) + STALE_WORKOUT_MS + 1000)!;
    expect(p.abandoned).toBe(true);
    expect(staleDateOf(p)).toBeUndefined();
  });
});

describe("reconcile", () => {
  const props = (over: Partial<ActivityProps> = {}): ActivityProps => ({ workoutId: "w", name: "Push", startedAt: 1, lastActivityAt: 1, abandoned: false, exercise: null, sets: 0, lastSet: null, accent: "#fff", ...over });
  const fake = (exists = false) => {
    const calls: string[] = [];
    const api: ActivityApi = {
      exists: () => exists,
      start: () => { calls.push("start"); exists = true; },
      update: () => void calls.push("update"),
      end: () => { calls.push("end"); exists = false; },
    };
    return { api, calls };
  };

  it("starts once, ignores identical content, updates on change, ends when the workout is gone", () => {
    const { api, calls } = fake();
    const st: Reconciler = { sent: null };
    reconcile(st, props(), api);
    reconcile(st, props(), api);
    reconcile(st, props({ sets: 1 }), api);
    reconcile(st, null, api);
    reconcile(st, null, api);
    expect(calls).toEqual(["start", "update", "end"]);
  });

  it("adopts a running activity after an app restart with an update, not a second start", () => {
    const { api, calls } = fake(true);
    reconcile({ sent: null }, props(), api);
    expect(calls).toEqual(["update"]);
  });

  it("ends a leftover activity when no workout is active", () => {
    const { api, calls } = fake(true);
    reconcile({ sent: null }, null, api);
    expect(calls).toEqual(["end"]);
  });

  it("replaces the activity when another workout becomes active", () => {
    const { api, calls } = fake(true);
    reconcile({ sent: props() }, props({ workoutId: "w2" }), api);
    expect(calls).toEqual(["end", "start"]);
  });
});
