/**
 * Opt-in parity check (npm run test:parity): domain/stats.ts vs the OLD stats endpoints of a running LOCAL backend,
 * on the seeded user of backend/prisma/seed-local.ts. Not part of `npm test`.
 * Env: PARITY_API (default http://localhost:3000), PARITY_EMAIL (test@gymgate.com), PARITY_PASSWORD (Test1234!).
 */
import { allExerciseStats, overview, progression, type StatsWorkoutRow } from "./stats";
import { toHundredths } from "./weight";

const API = process.env.PARITY_API ?? "http://localhost:3000";

interface ApiWorkout {
  id: string;
  status: "DRAFT" | "COMPLETED";
  workoutDate: string;
  createdAt: string;
  items: Array<{ exerciseId: string; notes: string | null; orderInWorkout: number; sets: Array<{ weight: string; repetitions: number; setNumber: number }> }>;
}

let token = "";
const get = async <T>(path: string): Promise<T> => {
  const res = await fetch(`${API}${path}`, { headers: { Authorization: `Bearer ${token}` } });
  if (!res.ok) throw new Error(`${path}: HTTP ${res.status}`);
  return ((await res.json()) as { data: T }).data;
};

const sameInstant = (a: string, b: string) => new Date(a).getTime() === new Date(b).getTime();

describe("stats parity with the local backend", () => {
  let rows: StatsWorkoutRow[] = [];

  beforeAll(async () => {
    const res = await fetch(`${API}/api/auth/login`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ email: process.env.PARITY_EMAIL ?? "test@gymgate.com", password: process.env.PARITY_PASSWORD ?? "Test1234!" }),
    });
    if (!res.ok) throw new Error(`login failed: HTTP ${res.status} (is the LOCAL backend running on ${API}?)`);
    token = ((await res.json()) as { data: { token: string } }).data.token;
    const workouts = await get<ApiWorkout[]>("/api/workouts");
    rows = workouts.map((w) => ({ id: w.id, status: w.status, workoutDate: w.workoutDate, createdAt: w.createdAt, items: w.items }));
  });

  it("has data to compare", () => {
    expect(rows.filter((w) => w.status === "COMPLETED").length).toBeGreaterThan(0);
  });

  it("/stats/all equals allExerciseStats, field by field", async () => {
    const server = await get<Array<Record<string, string | number | null>>>("/api/workouts/stats/all");
    const local = allExerciseStats(rows);
    expect(local.map((s) => s.exerciseId).sort()).toEqual(server.map((s) => s.exerciseId as string).sort());
    for (const s of server) {
      const l = local.find((x) => x.exerciseId === s.exerciseId)!;
      expect({
        maxWeight: toHundredths(l.maxWeight),
        maxWeightReps: l.maxWeightReps,
        maxWeightDate: sameInstant(l.maxWeightDate, s.maxWeightDate as string),
        lastWeight: toHundredths(l.lastWeight),
        lastReps: l.lastReps,
        lastWorkoutDate: sameInstant(l.lastWorkoutDate, s.lastWorkoutDate as string),
        totalWorkouts: l.totalWorkouts,
        lastNote: l.lastNote,
      }).toEqual({
        maxWeight: toHundredths(s.maxWeight as string),
        maxWeightReps: s.maxWeightReps,
        maxWeightDate: true,
        lastWeight: toHundredths(s.lastWeight as string),
        lastReps: s.lastReps,
        lastWorkoutDate: true,
        totalWorkouts: s.totalWorkouts,
        lastNote: s.lastNote ?? null,
      });
    }
    // Server order is maxWeight desc (ties arbitrary): the weights sequence must match.
    expect(local.map((s) => toHundredths(s.maxWeight))).toEqual(server.map((s) => toHundredths(s.maxWeight as string)));
  });

  it("/stats/overview equals overview()", async () => {
    const server = await get<{ workoutsLastMonth: number; workoutsLastYear: number; totalSets: number; totalVolume: number }>("/api/workouts/stats/overview");
    expect(overview(rows, new Date())).toEqual({
      workoutsLastMonth: server.workoutsLastMonth,
      workoutsLastYear: server.workoutsLastYear,
      totalSets: Number(server.totalSets),
      totalVolume: Number(server.totalVolume),
    });
  });

  it("/stats/progression/:id equals progression() for every exercise, both metrics", async () => {
    const ids = [...new Set(rows.flatMap((w) => w.items.map((i) => i.exerciseId)))];
    expect(ids.length).toBeGreaterThan(0);
    let tieDifferences = 0;
    for (const id of ids) {
      const local = progression(rows, id);
      for (const metric of ["maxSetWeight", "volume"] as const) {
        const server = await get<{ points: Array<{ workoutId: string; workoutDate: string; maxSetWeight: number; repetitionsAtMaxSet: number; volume: number; value: number }> }>(
          `/api/workouts/stats/progression/${id}?metric=${metric}`,
        );
        expect(server.points.map((p) => p.workoutId)).toEqual(local.map((p) => p.workoutId));
        server.points.forEach((p, i) => {
          const l = local[i]!;
          expect(sameInstant(p.workoutDate, l.workoutDate)).toBe(true);
          expect(p.maxSetWeight).toBeCloseTo(l.maxSetWeight, 9);
          if (p.repetitionsAtMaxSet !== l.repetitionsAtMaxSet) {
            // Several sets share the max weight: the server query has no set order inside a workout, so
            // "reps of the first such set" is physical-row-order dependent there. Accept any tied set, count it.
            const tied = rows
              .find((w) => w.id === p.workoutId)!
              .items.filter((i) => i.exerciseId === id)
              .flatMap((i) => i.sets)
              .filter((st) => toHundredths(st.weight) === toHundredths(l.maxSetWeight))
              .map((st) => st.repetitions);
            expect(tied).toContain(p.repetitionsAtMaxSet);
            tieDifferences += 1;
          }
          expect(p.volume).toBeCloseTo(l.volume, 9);
          expect(p.value).toBeCloseTo(metric === "volume" ? l.volume : l.maxSetWeight, 9);
        });
      }
    }
    if (tieDifferences > 0) console.warn(`parity: ${tieDifferences} point(s) differ only in reps among equally heavy sets (server order undefined)`);
  });
});
