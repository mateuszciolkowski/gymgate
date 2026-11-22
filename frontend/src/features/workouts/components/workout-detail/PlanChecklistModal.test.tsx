// @vitest-environment jsdom
import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import { PlanChecklistModal } from "./PlanChecklistModal";
import { planChecklist } from "@/utils/planChecklist";
import type { WorkoutPlan } from "@/types/workout";

const item = (exerciseId: string, orderInPlan: number, name: string) => ({
  id: `pi-${exerciseId}`,
  planId: "p",
  exerciseId,
  orderInPlan,
  exercise: { id: exerciseId, name, muscleGroups: [] },
});
const plan = {
  id: "p", name: "Push", creatorUserId: null, isPublic: false, isFavorite: false, createdAt: "", updatedAt: "",
  items: [item("c", 3, "Dipy"), item("a", 1, "Wyciskanie"), item("b", 2, "Rozpiętki")],
} as unknown as WorkoutPlan;

describe("planChecklist", () => {
  it("orders by plan and marks added / next / skipped / todo", () => {
    expect(planChecklist(plan, ["a"], ["b"]).map((r) => `${r.exerciseId}:${r.state}`)).toEqual(["a:added", "b:skipped", "c:next"]);
    expect(planChecklist(plan, ["c"], []).map((r) => r.state)).toEqual(["next", "todo", "added"]);
  });
});

describe("PlanChecklistModal", () => {
  it("adds a not-added exercise out of order and keeps added ones locked", () => {
    const onAdd = vi.fn();
    const onClose = vi.fn();
    render(<PlanChecklistModal isOpen plan={plan} addedExerciseIds={["a"]} skippedExerciseIds={[]} onClose={onClose} onAdd={onAdd} />);
    expect(screen.getByText("Plan 1/3 · kliknij, aby dodać")).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "Wyciskanie, Dodane" }));
    expect(onAdd).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole("button", { name: "Dipy" }));
    expect(onAdd).toHaveBeenCalledWith("c");
    expect(onClose).toHaveBeenCalled();
  });
});
