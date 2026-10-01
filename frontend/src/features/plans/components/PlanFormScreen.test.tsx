// @vitest-environment jsdom
import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import { PlanFormScreen } from "./PlanFormScreen";
import type { PlanDraft } from "../planDraft";

vi.mock("@/contexts/data", () => ({
  useData: () => ({ createPlan: vi.fn(), updatePlan: vi.fn(), exercises: [] }),
}));
vi.mock("@/contexts/AuthContext", () => ({ useAuth: () => ({ user: { isAdmin: false } }) }));
// The real modal pulls in the whole exercise list; only its "create new" button matters here.
vi.mock("@/features/exercises", () => ({
  ExerciseSelectionModal: ({ onCreateNewExercise }: { onCreateNewExercise?: () => void }) => (
    <button onClick={onCreateNewExercise}>Dodaj nowe ćwiczenie</button>
  ),
}));

const draft: PlanDraft = {
  name: "Moj plan",
  shortName: "MP",
  isPublic: false,
  isGlobal: false,
  items: [{ exerciseId: "bench", name: "Wyciskanie", muscleGroups: ["CHEST"] }],
};

const noop = () => {};

describe("PlanFormScreen draft handling", () => {
  it("restores the unsaved draft (name + exercises) when mounted with initialDraft", () => {
    render(<PlanFormScreen initialDraft={draft} onBack={noop} onSaved={noop} />);
    expect(screen.getByDisplayValue("Moj plan")).toBeTruthy();
    expect(screen.getByText("Wyciskanie")).toBeTruthy();
  });

  it("hands the current unsaved form state to onCreateNewExercise", () => {
    const onCreate = vi.fn();
    render(<PlanFormScreen initialDraft={draft} onBack={noop} onSaved={noop} onCreateNewExercise={onCreate} />);

    fireEvent.change(screen.getByDisplayValue("Moj plan"), { target: { value: "Zmieniony" } });
    fireEvent.click(screen.getByText("Dodaj ćwiczenie"));
    fireEvent.click(screen.getByText("Dodaj nowe ćwiczenie"));

    expect(onCreate).toHaveBeenCalledWith({ ...draft, name: "Zmieniony" });
  });
});
