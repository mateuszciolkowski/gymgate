import { fireEvent, screen } from "@testing-library/react-native";
import type { WorkoutItem } from "@/domain/types";
import { renderThemed } from "@/ui/testUtils";
import { WorkoutItemCard } from "./WorkoutItemCard";

const item: WorkoutItem = {
  id: "i1",
  workoutId: "w1",
  exerciseId: "e1",
  orderInWorkout: 1,
  createdAt: "2026-01-01T10:00:00.000Z",
  updatedAt: "2026-01-01T10:00:00.000Z",
  exercise: { id: "e1", name: "Wyciskanie", muscleGroups: ["CHEST"] },
  sets: [],
};

const props = (over: Partial<Parameters<typeof WorkoutItemCard>[0]> = {}) => ({
  item,
  number: 1,
  canEdit: true,
  isExpanded: true,
  previousSets: [{ setNumber: 1, weight: "60", repetitions: 8 }],
  onToggle: jest.fn(),
  onAddSet: jest.fn(),
  onUpdateSet: jest.fn(),
  onDeleteSet: jest.fn(),
  onDeleteItem: jest.fn(),
  ...over,
});

describe("WorkoutItemCard", () => {
  it("opens a draft pre-filled from the previous session and saves it", async () => {
    const p = props();
    await renderThemed(<WorkoutItemCard {...p} />);
    expect(screen.getByTestId("draft-weight").props.value).toBe("60");
    expect(screen.getByTestId("draft-reps").props.value).toBe("8");
    await fireEvent.changeText(screen.getByTestId("draft-weight"), "62,5");
    await fireEvent.press(screen.getByTestId("draft-confirm"));
    expect(p.onAddSet).toHaveBeenCalledWith("i1", { weight: 62.5, repetitions: 8 });
  });
  it("rejects invalid values with the PWA text", async () => {
    const p = props();
    await renderThemed(<WorkoutItemCard {...p} />);
    await fireEvent.changeText(screen.getByTestId("draft-reps"), "0");
    await fireEvent.press(screen.getByTestId("draft-confirm"));
    expect(screen.getByText("Wpisz poprawny ciężar (≥0) i powtórzenia (≥1)")).toBeOnTheScreen();
    expect(p.onAddSet).not.toHaveBeenCalled();
  });
  it("is read-only when completed", async () => {
    await renderThemed(<WorkoutItemCard {...props({ canEdit: false })} />);
    expect(screen.queryByTestId("draft-weight")).toBeNull();
    expect(screen.queryByText("+ Dodaj serię")).toBeNull();
  });
});
