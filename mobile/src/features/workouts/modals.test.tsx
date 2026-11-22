import { fireEvent, screen } from "@testing-library/react-native";
import type { Workout } from "@/domain/types";
import { renderThemed } from "@/ui/testUtils";
import { PlanBanner } from "./PlanBanner";
import { PlanChecklistModal } from "./PlanChecklistModal";
import { WorkoutEditModal } from "./WorkoutEditModal";
import { WorkoutNotesModal } from "./WorkoutNotesModal";

const workout = (over: Partial<Workout> = {}): Workout => ({
  id: "w1",
  userId: "u1",
  workoutDate: new Date(2026, 10, 12, 9, 30).toISOString(),
  status: "DRAFT",
  workoutName: "Klatka",
  gymName: "CityFit",
  createdAt: new Date(2026, 10, 12, 9, 30).toISOString(),
  updatedAt: new Date(2026, 10, 12, 9, 30).toISOString(),
  items: [],
  ...over,
});

describe("WorkoutNotesModal", () => {
  it("loads the current text and saves it trimmed", async () => {
    const onSave = jest.fn();
    const onClose = jest.fn();
    await renderThemed(<WorkoutNotesModal isOpen initialNotes="stara" onClose={onClose} onSave={onSave} />);
    expect(screen.getByText("Sesja treningowa")).toBeOnTheScreen();
    expect(screen.getByTestId("workout-notes-input").props.value).toBe("stara");
    await fireEvent.changeText(screen.getByTestId("workout-notes-input"), "  nowa notatka \n");
    await fireEvent.press(screen.getByTestId("workout-notes-save"));
    expect(onSave).toHaveBeenCalledWith("nowa notatka");
    expect(onClose).toHaveBeenCalled();
  });
  it("saves an empty text to clear the note and reports a failed save", async () => {
    const onSave = jest.fn(() => {
      throw new Error("x");
    });
    const onClose = jest.fn();
    await renderThemed(<WorkoutNotesModal isOpen initialNotes="stara" onClose={onClose} onSave={onSave} />);
    await fireEvent.changeText(screen.getByTestId("workout-notes-input"), "   ");
    await fireEvent.press(screen.getByTestId("workout-notes-save"));
    expect(onSave).toHaveBeenCalledWith("");
    expect(onClose).not.toHaveBeenCalled();
  });
});

describe("WorkoutEditModal", () => {
  it("active workout: fields only, can clear name and gym (D-23)", async () => {
    const onSave = jest.fn();
    await renderThemed(<WorkoutEditModal isOpen workout={workout()} onClose={jest.fn()} onSave={onSave} />);
    expect(screen.getByText("Aktywny trening")).toBeOnTheScreen();
    expect(screen.queryByTestId("edit-start")).toBeNull();
    await fireEvent.changeText(screen.getByTestId("edit-name"), "  ");
    await fireEvent.changeText(screen.getByTestId("edit-gym"), "");
    await fireEvent.press(screen.getByTestId("edit-save"));
    expect(onSave).toHaveBeenCalledWith({ workoutName: "", gymName: "", workoutDate: workout().workoutDate });
  });
  it("completed workout: start/end derived from createdAt + duration, total sent as durationSeconds", async () => {
    const onSave = jest.fn();
    await renderThemed(<WorkoutEditModal isOpen workout={workout({ status: "COMPLETED", durationSeconds: 3900 })} onClose={jest.fn()} onSave={onSave} />);
    expect(screen.getByText("Zakończony trening")).toBeOnTheScreen();
    expect(screen.getByText("09:30")).toBeOnTheScreen();
    expect(screen.getByText("10:35")).toBeOnTheScreen();
    expect(screen.getByTestId("edit-total").props.children.join("")).toBe("Czas całkowity: 1h 5m");
    await fireEvent.press(screen.getByTestId("edit-save"));
    expect(onSave).toHaveBeenCalledWith({ workoutName: "Klatka", gymName: "CityFit", workoutDate: workout().workoutDate, durationSeconds: 3900 });
  });
});

describe("PlanBanner", () => {
  it("adds or skips the next plan exercise", async () => {
    const onAdd = jest.fn();
    const onSkip = jest.fn();
    await renderThemed(<PlanBanner nextName="Martwy ciąg" onAdd={onAdd} onSkip={onSkip} />);
    expect(screen.getByText("Kolejne z planu")).toBeOnTheScreen();
    await fireEvent.press(screen.getByTestId("plan-add-next"));
    await fireEvent.press(screen.getByTestId("plan-skip"));
    expect(onAdd).toHaveBeenCalledTimes(1);
    expect(onSkip).toHaveBeenCalledTimes(1);
  });
  it("shows the completed indicator when nothing is left", async () => {
    await renderThemed(<PlanBanner nextName={null} onAdd={jest.fn()} onSkip={jest.fn()} />);
    expect(screen.getByText("Wszystkie ćwiczenia z planu zostały dodane")).toBeOnTheScreen();
    expect(screen.queryByText("Pomiń")).toBeNull();
  });
});

describe("PlanChecklistModal", () => {
  const plan = {
    name: "Push",
    items: [
      { exerciseId: "a", orderInPlan: 1, exercise: { name: "Wyciskanie" } },
      { exerciseId: "b", orderInPlan: 2, exercise: { name: "Rozpiętki" } },
      { exerciseId: "c", orderInPlan: 3, exercise: { name: "Dipy" } },
    ],
  };
  it("shows progress and states; a not-added exercise is added out of order, an added one is locked", async () => {
    const onAdd = jest.fn();
    const onClose = jest.fn();
    await renderThemed(<PlanChecklistModal isOpen plan={plan} addedExerciseIds={["a"]} skippedExerciseIds={[]} onClose={onClose} onAdd={onAdd} />);
    expect(screen.getByText("Plan 1/3 · stuknij, aby dodać")).toBeOnTheScreen();
    expect(screen.getByText("Dodane")).toBeOnTheScreen();
    expect(screen.getByText("Następne")).toBeOnTheScreen();
    await fireEvent.press(screen.getByTestId("plan-item-1"));
    expect(onAdd).not.toHaveBeenCalled();
    await fireEvent.press(screen.getByTestId("plan-item-3"));
    expect(onAdd).toHaveBeenCalledWith("c");
    expect(onClose).toHaveBeenCalled();
  });
});
