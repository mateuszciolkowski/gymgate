import { describe, expect, it } from "vitest";
import { computePreviousSets } from "./previousSets";
import type { Workout } from "@/types/workout";

function makeWorkout(overrides: Partial<Workout> & { id: string }): Workout {
  return {
    userId: "u1",
    workoutDate: "2026-01-01T00:00:00.000Z",
    status: "COMPLETED",
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z",
    items: [],
    ...overrides,
  };
}

function makeItem(exerciseId: string, sets: Array<{ setNumber: number; weight: string; repetitions: number }>) {
  return {
    id: `item-${exerciseId}`,
    workoutId: "w",
    exerciseId,
    orderInWorkout: 0,
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z",
    exercise: { id: exerciseId, name: exerciseId, muscleGroups: [] },
    sets: sets.map((s, i) => ({
      id: `set-${exerciseId}-${i}`,
      itemId: `item-${exerciseId}`,
      createdAt: "2026-01-01T00:00:00.000Z",
      updatedAt: "2026-01-01T00:00:00.000Z",
      ...s,
    })),
  };
}

describe("computePreviousSets", () => {
  it("uses the most recent DRAFT workout's real sets instead of an older COMPLETED one", () => {
    // Regression: previously only COMPLETED workouts were considered, so an
    // exercise's most recent (but still-DRAFT) session was silently skipped
    // and an older, already-finished session won instead.
    const olderCompleted = makeWorkout({
      id: "w-old",
      workoutDate: "2026-01-01T00:00:00.000Z",
      status: "COMPLETED",
      items: [makeItem("bench", [{ setNumber: 1, weight: "60", repetitions: 8 }])],
    });
    const newerDraft = makeWorkout({
      id: "w-new",
      workoutDate: "2026-01-05T00:00:00.000Z",
      status: "DRAFT",
      items: [makeItem("bench", [{ setNumber: 1, weight: "80", repetitions: 5 }])],
    });

    const { previousSetsByExerciseId, latestSetsByExerciseId } = computePreviousSets(
      [olderCompleted, newerDraft],
      "current-open-workout",
    );

    expect(previousSetsByExerciseId.get("bench")).toEqual([
      { setNumber: 1, weight: "80", repetitions: 5 },
    ]);
    expect(latestSetsByExerciseId.get("bench")).toBe("80 kg × 5");
  });

  it("excludes only the currently open workout, not other workouts by status", () => {
    const currentlyOpen = makeWorkout({
      id: "w-current",
      workoutDate: "2026-01-10T00:00:00.000Z",
      status: "DRAFT",
      items: [makeItem("squat", [{ setNumber: 1, weight: "999", repetitions: 1 }])],
    });
    const previous = makeWorkout({
      id: "w-prev",
      workoutDate: "2026-01-03T00:00:00.000Z",
      status: "COMPLETED",
      items: [makeItem("squat", [{ setNumber: 1, weight: "100", repetitions: 5 }])],
    });

    const { previousSetsByExerciseId } = computePreviousSets(
      [currentlyOpen, previous],
      "w-current",
    );

    expect(previousSetsByExerciseId.get("squat")).toEqual([
      { setNumber: 1, weight: "100", repetitions: 5 },
    ]);
  });

  it("skips workouts with no recorded sets for that exercise (empty draft item)", () => {
    const emptyDraft = makeWorkout({
      id: "w-empty",
      workoutDate: "2026-01-08T00:00:00.000Z",
      status: "DRAFT",
      items: [makeItem("row", [])],
    });
    const previous = makeWorkout({
      id: "w-prev",
      workoutDate: "2026-01-02T00:00:00.000Z",
      status: "COMPLETED",
      items: [makeItem("row", [{ setNumber: 1, weight: "40", repetitions: 10 }])],
    });

    const { previousSetsByExerciseId } = computePreviousSets(
      [emptyDraft, previous],
      "current-open-workout",
    );

    expect(previousSetsByExerciseId.get("row")).toEqual([
      { setNumber: 1, weight: "40", repetitions: 10 },
    ]);
  });
});
