import { seedExercise, setupWorld } from "../testing";
import { addItem, addSet, completeWorkout, createWorkout, getAllStats, getExerciseStats, getProgression, getStatsOverview } from "./index";

const E = "aaaaaaaa-0000-4000-8000-000000000001";

describe("stats queries over the local database", () => {
  it("feed domain/stats.ts from completed workouts only (derived, never stored)", () => {
    const { db, ctx } = setupWorld();
    seedExercise(db, E, "Bench");
    const day = (d: string, sets: Array<[number, number]>, complete = true) => {
      const w = createWorkout(ctx, { workoutDate: `${d}T00:00:00.000Z` });
      const item = addItem(ctx, w.id, E);
      sets.forEach(([weight, repetitions]) => addSet(ctx, item.id, { weight, repetitions }));
      if (complete) completeWorkout(ctx, w.id, 100);
    };
    day("2026-03-01", [[60, 5], [62.5, 4]]);
    day("2026-03-08", [[65, 3]]);
    day("2026-03-09", [[200, 1]], false);

    expect(getExerciseStats(db, E)).toMatchObject({ maxWeight: "65", maxWeightReps: 3, lastWeight: "65", totalWorkouts: 2 });
    expect(getAllStats(db)).toHaveLength(1);
    expect(getProgression(db, E, { metric: "volume" }).points.map((p) => p.value)).toEqual([300 + 250, 195]);
    expect(getStatsOverview(db, new Date("2026-03-10T00:00:00.000Z"))).toEqual({
      workoutsLastMonth: 2,
      workoutsLastYear: 2,
      totalSets: 3,
      totalVolume: 745,
    });
  });
});
