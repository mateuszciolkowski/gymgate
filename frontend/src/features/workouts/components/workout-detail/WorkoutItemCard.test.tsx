// @vitest-environment jsdom
import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { WorkoutItemCard } from "./WorkoutItemCard";
import { computePreviousSets } from "@/utils/previousSets";
import type { Workout, WorkoutItem } from "@/types/workout";

function makeItem(overrides: Partial<WorkoutItem> = {}): WorkoutItem {
  return {
    id: "item-1",
    workoutId: "w-current",
    exerciseId: "bench",
    orderInWorkout: 0,
    createdAt: "2026-01-10T00:00:00.000Z",
    updatedAt: "2026-01-10T00:00:00.000Z",
    exercise: { id: "bench", name: "Wyciskanie sztangi", muscleGroups: [] },
    sets: [],
    ...overrides,
  };
}

const noop = () => {};

describe("WorkoutItemCard draft prefill", () => {
  it("prefills the new-set draft from the most recent workout's real sets, even if that workout is still DRAFT", () => {
    // End-to-end regression for the reported bug: the "previous set" hint was
    // computed only from COMPLETED workouts, so an unfinished-but-more-recent
    // session's real numbers were ignored in favor of stale, older data —
    // this exercises the full path: workouts -> computePreviousSets -> the
    // actual rendered draft-set input.
    const olderCompleted: Workout = {
      id: "w-old",
      userId: "u1",
      workoutDate: "2026-01-01T00:00:00.000Z",
      status: "COMPLETED",
      createdAt: "2026-01-01T00:00:00.000Z",
      updatedAt: "2026-01-01T00:00:00.000Z",
      items: [makeItem({ id: "item-old", workoutId: "w-old", sets: [
        { id: "s1", itemId: "item-old", setNumber: 1, weight: "60", repetitions: 8, createdAt: "", updatedAt: "" },
      ] })],
    };
    const newerDraft: Workout = {
      id: "w-new-draft",
      userId: "u1",
      workoutDate: "2026-01-08T00:00:00.000Z",
      status: "DRAFT",
      createdAt: "2026-01-08T00:00:00.000Z",
      updatedAt: "2026-01-08T00:00:00.000Z",
      items: [makeItem({ id: "item-new", workoutId: "w-new-draft", sets: [
        { id: "s2", itemId: "item-new", setNumber: 1, weight: "80", repetitions: 5, createdAt: "", updatedAt: "" },
      ] })],
    };

    // "current-open-workout" is the workout the user has open right now (e.g.
    // just added the exercise, no sets logged yet) — excluded from the hint.
    const { previousSetsByExerciseId } = computePreviousSets(
      [olderCompleted, newerDraft],
      "current-open-workout",
    );

    const currentItem = makeItem({ sets: [] });

    render(
      <WorkoutItemCard
        item={currentItem}
        exerciseNumber={1}
        isCompleted={false}
        isExpanded={true}
        stats={{
          id: "stat-1",
          userId: "u1",
          exerciseId: "bench",
          maxWeight: "999",
          maxWeightReps: 1,
          maxWeightDate: "2026-01-01T00:00:00.000Z",
          lastWeight: "999",
          lastReps: 1,
          lastWorkoutDate: "2026-01-01T00:00:00.000Z",
          totalWorkouts: 2,
        }}
        previousSets={previousSetsByExerciseId.get("bench")}
        onToggleExpand={noop}
        onUpdateSet={noop}
        onDeleteSet={noop}
        onAddSet={noop}
        onDeleteExercise={noop}
        onUpdateExerciseNotes={vi.fn()}
      />,
    );

    // Should reflect the newer DRAFT workout's real numbers (80x5), not the
    // older COMPLETED one (60x8) and not the unrelated stats fallback (999x1).
    expect(screen.getByDisplayValue("80")).toBeTruthy();
    expect(screen.getByDisplayValue("5")).toBeTruthy();
  });
});
