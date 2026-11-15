import {
  allExerciseStats,
  exerciseStats,
  lastPoint,
  overview,
  progression,
  progressionSeries,
  recordPoint,
  type StatsWorkoutRow,
} from "./stats";

let n = 0;
const workout = (
  date: string,
  created: string,
  items: Array<{ ex: string; sets: Array<[number | string, number]>; notes?: string }>,
  status: "DRAFT" | "COMPLETED" = "COMPLETED",
): StatsWorkoutRow => ({
  id: `w${++n}`,
  status,
  workoutDate: date,
  createdAt: created,
  items: items.map((i, idx) => ({
    exerciseId: i.ex,
    notes: i.notes ?? null,
    orderInWorkout: idx + 1,
    sets: i.sets.map(([weight, repetitions], s) => ({ weight, repetitions, setNumber: s + 1 })),
  })),
});

describe("progression", () => {
  it("heaviest set per workout, reps of the FIRST set with that weight, volume = sum", () => {
    const w = workout("2026-01-01T00:00:00.000Z", "2026-01-01T09:00:00.000Z", [
      { ex: "e", sets: [[50, 10], [60, 5], [60, 8], [55, 6]] },
    ]);
    expect(progression([w], "e")).toEqual([
      { workoutId: w.id, workoutDate: w.workoutDate, maxSetWeight: 60, repetitionsAtMaxSet: 5, volume: 500 + 300 + 480 + 330 },
    ]);
  });

  it("ignores drafts and other exercises; orders by workoutDate then createdAt (two workouts on one day)", () => {
    const late = workout("2026-01-02T00:00:00.000Z", "2026-01-02T20:00:00.000Z", [{ ex: "e", sets: [[70, 3]] }]);
    const sameDayB = workout("2026-01-01T00:00:00.000Z", "2026-01-01T18:00:00.000Z", [{ ex: "e", sets: [[65, 4]] }]);
    const sameDayA = workout("2026-01-01T00:00:00.000Z", "2026-01-01T08:00:00.000Z", [{ ex: "e", sets: [[60, 5]] }]);
    const draft = workout("2026-01-03T00:00:00.000Z", "2026-01-03T08:00:00.000Z", [{ ex: "e", sets: [[999, 1]] }], "DRAFT");
    const other = workout("2026-01-04T00:00:00.000Z", "2026-01-04T08:00:00.000Z", [{ ex: "x", sets: [[1, 1]] }]);
    const pts = progression([late, sameDayB, draft, other, sameDayA], "e");
    expect(pts.map((p) => p.workoutId)).toEqual([sameDayA.id, sameDayB.id, late.id]);
    expect(lastPoint(pts)?.workoutId).toBe(late.id);
  });

  it("handles weight 0 and fractional weights exactly (hundredths)", () => {
    const w = workout("2026-01-01T00:00:00.000Z", "2026-01-01T09:00:00.000Z", [
      { ex: "e", sets: [[0, 10], [0, 12]] },
    ]);
    expect(progression([w], "e")[0]).toMatchObject({ maxSetWeight: 0, repetitionsAtMaxSet: 10, volume: 0 });
    const f = workout("2026-01-02T00:00:00.000Z", "2026-01-02T09:00:00.000Z", [
      { ex: "e", sets: [["22.5", 3], ["0.1", 3], ["0.2", 3]] },
    ]);
    expect(progression([f], "e")[0]).toMatchObject({ maxSetWeight: 22.5, volume: 68.4 });
    // 0.1 + 0.2 style float noise must not appear: 0.1*3 + 0.2*3 in hundredths is exactly 90 -> 0.9
    expect(progression([workout("2026-01-03T00:00:00.000Z", "x", [{ ex: "e", sets: [["0.1", 3], ["0.2", 3]] }])], "e")[0]!.volume).toBe(0.9);
  });

  it("filters by from/to (inclusive) and builds the metric series", () => {
    const a = workout("2026-01-01T00:00:00.000Z", "a", [{ ex: "e", sets: [[10, 1]] }]);
    const b = workout("2026-02-01T00:00:00.000Z", "b", [{ ex: "e", sets: [[20, 2]] }]);
    const pts = progression([a, b], "e", { from: "2026-02-01T00:00:00.000Z" });
    expect(pts).toHaveLength(1);
    expect(progressionSeries("e", pts, "volume").points[0]).toMatchObject({ value: 40, maxSetWeight: 20 });
    expect(progressionSeries("e", pts).points[0]?.value).toBe(20);
  });
});

describe("record, last, count", () => {
  it("record tie goes to the earliest workout", () => {
    const a = workout("2026-01-01T00:00:00.000Z", "a", [{ ex: "e", sets: [[100, 3]] }]);
    const b = workout("2026-01-08T00:00:00.000Z", "b", [{ ex: "e", sets: [[100, 5]] }]);
    const c = workout("2026-01-15T00:00:00.000Z", "c", [{ ex: "e", sets: [[90, 8]] }]);
    const s = exerciseStats([c, b, a], "e")!;
    expect(s).toMatchObject({
      maxWeight: "100",
      maxWeightReps: 3,
      maxWeightDate: a.workoutDate,
      lastWeight: "90",
      lastReps: 8,
      lastWorkoutDate: c.workoutDate,
      totalWorkouts: 3,
    });
    expect(recordPoint(progression([a, b, c], "e"))?.workoutId).toBe(a.id);
  });

  it("lastNote comes from the newest completed workout containing the exercise (empty -> null)", () => {
    const a = workout("2026-01-01T00:00:00.000Z", "a", [{ ex: "e", sets: [[1, 1]], notes: "old" }]);
    const b = workout("2026-01-02T00:00:00.000Z", "b", [{ ex: "e", sets: [[1, 1]], notes: "new" }]);
    const d = workout("2026-01-03T00:00:00.000Z", "d", [{ ex: "e", sets: [[1, 1]], notes: "draft" }], "DRAFT");
    expect(exerciseStats([a, b, d], "e")?.lastNote).toBe("new");
    const c = workout("2026-01-04T00:00:00.000Z", "c", [{ ex: "e", sets: [[1, 1]], notes: "" }]);
    expect(exerciseStats([a, b, c], "e")?.lastNote).toBeNull();
  });

  it("no completed workout -> null; exercise with no sets is not listed", () => {
    expect(exerciseStats([], "e")).toBeNull();
    const w = workout("2026-01-01T00:00:00.000Z", "a", [{ ex: "e", sets: [] }]);
    expect(allExerciseStats([w])).toEqual([]);
  });

  it("allExerciseStats is ordered by record weight, heaviest first", () => {
    const w = workout("2026-01-01T00:00:00.000Z", "a", [
      { ex: "light", sets: [[10, 1]] },
      { ex: "heavy", sets: [[100, 1]] },
      { ex: "mid", sets: [[50.5, 1]] },
    ]);
    expect(allExerciseStats([w]).map((s) => s.exerciseId)).toEqual(["heavy", "mid", "light"]);
  });
});

describe("overview", () => {
  const now = new Date("2026-06-15T12:00:00.000Z");
  it("month/year windows by workoutDate; sets and volume over all completed", () => {
    const ws = [
      workout("2026-06-01T00:00:00.000Z", "a", [{ ex: "e", sets: [[100, 5], [50, 10]] }]),
      workout("2026-05-15T12:00:00.000Z", "b", [{ ex: "e", sets: [[20, 5]] }]), // exactly one month ago: included
      workout("2026-05-15T11:59:59.999Z", "c", [{ ex: "e", sets: [[20, 5]] }]), // just outside the month
      workout("2025-06-15T12:00:00.000Z", "d", [{ ex: "e", sets: [[10, 1]] }]), // exactly one year ago: included
      workout("2024-01-01T00:00:00.000Z", "e", [{ ex: "e", sets: [[10, 1]] }]),
      workout("2026-06-10T00:00:00.000Z", "f", [{ ex: "e", sets: [[999, 9]] }], "DRAFT"),
    ];
    expect(overview(ws, now)).toEqual({
      workoutsLastMonth: 2,
      workoutsLastYear: 4,
      totalSets: 6,
      totalVolume: 500 + 500 + 100 + 100 + 10 + 10,
    });
  });
});

// Mirrors backend/prisma/seed-local.ts: 16 completed workouts = 4 cycles x 4 day types, every 6 days, weights
// 60 + c*2.5 etc. The oracle below is the seed's own stats accumulation (newest -> oldest).
describe("seed-local fixture", () => {
  const types: Array<Array<[string, Array<[number, number]>]>> = [
    [["bench", [[60, 8], [65, 6], [70, 5]]], ["incline", [[22, 10], [26, 8], [26, 7]]]],
    [["deadlift", [[80, 5], [100, 4], [110, 3]]], ["row", [[55, 8], [60, 7], [60, 6]]]],
    [["squat", [[65, 8], [75, 6], [85, 5]]], ["press", [[110, 12], [130, 10], [130, 9]]]],
    [["ohp", [[42.5, 8], [47.5, 6], [47.5, 5]]], ["curl", [[28, 10], [32, 8], [32, 7]]]],
  ];
  const step: Record<string, number> = { bench: 2.5, incline: 2, deadlift: 5, row: 2.5, squat: 2.5, press: 5, ohp: 2.5, curl: 2 };
  const base = Date.parse("2026-09-01T00:00:00.000Z");
  const ws: StatsWorkoutRow[] = [];
  for (let i = 15; i >= 0; i--) {
    const c = Math.floor(i / 4);
    const date = new Date(base - ((15 - i) * 6 + 3) * 86400000).toISOString();
    ws.push(
      workout(
        date,
        date,
        types[i % 4]!.map(([ex, sets]) => ({ ex, sets: sets.map(([w, r]) => [w + c * step[ex]!, r] as [number, number]) })),
      ),
    );
  }

  it("matches the seed's accumulated stats and counts", () => {
    const all = allExerciseStats(ws);
    expect(all).toHaveLength(8);
    const bench = all.find((s) => s.exerciseId === "bench")!;
    // newest cycle (c=3) is the heaviest: 70 + 7.5 = 77.5 x 5 at the newest bench workout
    expect(bench).toMatchObject({ maxWeight: "77.5", maxWeightReps: 5, lastWeight: "77.5", lastReps: 5, totalWorkouts: 4 });
    const squat = all.find((s) => s.exerciseId === "squat")!;
    expect(squat).toMatchObject({ maxWeight: "92.5", maxWeightReps: 5, totalWorkouts: 4 });
    const o = overview(ws, new Date(base));
    expect(o).toMatchObject({ workoutsLastYear: 16, totalSets: 16 * 6 });
    expect(o.workoutsLastMonth).toBe(5); // 3, 9, 15, 21, 27 days ago
    // sorted heaviest first: press 130 + 15 = 145 leads, then deadlift 125
    expect(all.slice(0, 2).map((s) => s.exerciseId)).toEqual(["press", "deadlift"]);
  });
});
