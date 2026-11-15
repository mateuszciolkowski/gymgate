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
  autoDraft: true,
  previousSets: [{ setNumber: 1, weight: "60", repetitions: 8 }],
  onToggle: jest.fn(),
  onAddSet: jest.fn(),
  onUpdateSet: jest.fn(),
  onDeleteSet: jest.fn(),
  onDeleteItem: jest.fn(),
  onUpdateNotes: jest.fn(),
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
  it("does not open a draft for an exercise that was not just added", async () => {
    await renderThemed(<WorkoutItemCard {...props({ autoDraft: false })} />);
    expect(screen.queryByTestId("draft-weight")).toBeNull();
    expect(screen.getByText("Brak zapisanych serii.")).toBeOnTheScreen();
    await fireEvent.press(screen.getByText("+ Dodaj serię"));
    expect(screen.getByTestId("draft-weight").props.value).toBe("60");
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
  it("shows the carried-over note in the header", async () => {
    await renderThemed(<WorkoutItemCard {...props({ isExpanded: false, item: { ...item, previousNote: "schodź wolniej" } })} />);
    expect(screen.getByText('"schodź wolniej"')).toBeOnTheScreen();
    expect(screen.getByText("Uwaga:")).toBeOnTheScreen();
  });
  it("saves the exercise note trimmed and clears it when empty", async () => {
    const p = props({ item: { ...item, notes: "stara", sets: [{ id: "s1", itemId: "i1", setNumber: 1, weight: "60", repetitions: 8, createdAt: item.createdAt, updatedAt: item.updatedAt }] } });
    await renderThemed(<WorkoutItemCard {...p} />);
    await fireEvent.press(screen.getByText("Notatki"));
    expect(screen.getByTestId("item-notes-input-1").props.value).toBe("stara");
    await fireEvent.changeText(screen.getByTestId("item-notes-input-1"), "  nowa  ");
    await fireEvent.press(screen.getByText("Zapisz notatkę"));
    expect(p.onUpdateNotes).toHaveBeenLastCalledWith("i1", "nowa");
    await fireEvent.press(screen.getByText("Notatki"));
    await fireEvent.changeText(screen.getByTestId("item-notes-input-1"), "   ");
    await fireEvent.press(screen.getByText("Zapisz notatkę"));
    expect(p.onUpdateNotes).toHaveBeenLastCalledWith("i1", "");
  });
  it("cancel keeps the stored note", async () => {
    const p = props({ item: { ...item, notes: "stara" } });
    await renderThemed(<WorkoutItemCard {...p} />);
    await fireEvent.press(screen.getByText("Notatki"));
    await fireEvent.changeText(screen.getByTestId("item-notes-input-1"), "zmiana");
    await fireEvent.press(screen.getByText("Anuluj", { exact: true }));
    expect(p.onUpdateNotes).not.toHaveBeenCalled();
    expect(screen.getByText("stara")).toBeOnTheScreen();
  });
  it("read-only card shows the note but no notes button", async () => {
    await renderThemed(<WorkoutItemCard {...props({ canEdit: false, item: { ...item, notes: "tylko odczyt" } })} />);
    expect(screen.getByText("tylko odczyt")).toBeOnTheScreen();
    expect(screen.queryByText("Notatki")).toBeNull();
  });
});
