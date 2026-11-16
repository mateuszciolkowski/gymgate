import { fireEvent, screen } from "@testing-library/react-native";
import { eq } from "drizzle-orm";
import { getExercise, listExercises } from "@/db/repositories";
import { exercises } from "@/db/schema";
import { outboxOps, seedExercise, setupWorld } from "@/db/testing";
import type { Ctx, Db } from "@/db/types";
import { renderThemed } from "@/ui/testUtils";
import { ExerciseFormScreen } from "./ExerciseFormScreen";
import { ExerciseList } from "./ExerciseList";
import { deleteMessage } from "./ExercisesScreen";

jest.mock("react-native-keyboard-controller", () => jest.requireActual("react-native-keyboard-controller/jest"));
// FlashList is ESM-only and needs a native layout pass; a FlatList renders the same items.
jest.mock("@shopify/flash-list", () => ({ FlashList: jest.requireActual("react-native").FlatList }));
const mockRouter = { back: jest.fn(), canGoBack: () => true, replace: jest.fn(), push: jest.fn() };
jest.mock("expo-router", () => ({ useRouter: () => mockRouter }));
const mockWorld: { ctx: Ctx } = { ctx: null as unknown as Ctx };
jest.mock("@/providers", () => ({
  useDb: () => ({ db: mockWorld.ctx.db, userId: mockWorld.ctx.userId }),
  useDbQuery: (read: (db: Db) => unknown) => read(mockWorld.ctx.db),
  useAction: () => (run: (ctx: Ctx) => unknown) => run(mockWorld.ctx),
}));

function world(isAdmin = false) {
  const w = setupWorld({ isAdmin });
  mockWorld.ctx = w.ctx;
  mockRouter.back.mockClear();
  return w;
}

describe("ExerciseFormScreen (create)", () => {
  it("validates in the PWA order", async () => {
    const { db } = world();
    await renderThemed(<ExerciseFormScreen />);
    await fireEvent.press(screen.getByTestId("exercise-submit"));
    expect(screen.getByText("Nazwa ćwiczenia jest wymagana")).toBeOnTheScreen();
    await fireEvent.changeText(screen.getByTestId("exercise-name"), "  Przysiad  ");
    await fireEvent.press(screen.getByTestId("exercise-submit"));
    expect(screen.getByText("Wybierz przynajmniej jedną grupę mięśniową")).toBeOnTheScreen();
    expect(listExercises(db)).toHaveLength(0);
  });
  it("creates with trimmed fields, queues exercise.create and goes back", async () => {
    const { db } = world();
    await renderThemed(<ExerciseFormScreen />);
    await fireEvent.changeText(screen.getByTestId("exercise-name"), "  Przysiad  ");
    await fireEvent.press(screen.getByTestId("exercise-group-select-0"));
    await fireEvent.press(screen.getByTestId("exercise-group-select-0-QUADS"));
    await fireEvent.changeText(screen.getByTestId("exercise-description"), "  opis ");
    await fireEvent.press(screen.getByTestId("exercise-submit"));
    const [row] = listExercises(db);
    expect(row).toMatchObject({ name: "Przysiad", muscleGroups: ["QUADS"], description: "opis", creatorUserId: "u1" });
    expect(outboxOps(db).map((o) => o.type)).toEqual(["exercise.create"]);
    expect(mockRouter.back).toHaveBeenCalled();
  });
  it("adds the new exercise to the workout when opened from the picker", async () => {
    const { db, ctx } = world();
    const { createWorkout } = jest.requireActual("@/db/repositories");
    const w = createWorkout(ctx);
    await renderThemed(<ExerciseFormScreen workoutId={w.id} />);
    await fireEvent.changeText(screen.getByTestId("exercise-name"), "Nowe");
    await fireEvent.press(screen.getByTestId("exercise-group-select-0"));
    await fireEvent.press(screen.getByTestId("exercise-group-select-0-ABS"));
    await fireEvent.press(screen.getByTestId("exercise-submit"));
    expect(outboxOps(db).map((o) => o.type)).toEqual(["workout.create", "exercise.create", "item.add"]);
  });
  it("a group chosen in one field is disabled in the others; extra fields can be removed", async () => {
    world();
    await renderThemed(<ExerciseFormScreen />);
    await fireEvent.press(screen.getByTestId("exercise-group-select-0"));
    await fireEvent.press(screen.getByTestId("exercise-group-select-0-ABS"));
    await fireEvent.press(screen.getByTestId("exercise-group-add"));
    await fireEvent.press(screen.getByTestId("exercise-group-select-1"));
    expect(screen.getByTestId("exercise-group-select-1-ABS").props.accessibilityState.disabled).toBe(true);
    await fireEvent.press(screen.getByTestId("exercise-group-select-1-BACK"));
    await fireEvent.press(screen.getByTestId("exercise-group-remove-1"));
    expect(screen.queryByTestId("exercise-group-select-1")).toBeNull();
  });
  it("global switch is hidden for regular users", async () => {
    world(false);
    await renderThemed(<ExerciseFormScreen />);
    expect(screen.queryByText("Globalne ćwiczenie")).toBeNull();
  });
  it("global switch is shown to admins and creates a built-in exercise", async () => {
    const { db } = world(true);
    await renderThemed(<ExerciseFormScreen />);
    await fireEvent.press(screen.getByRole("switch"));
    await fireEvent.changeText(screen.getByTestId("exercise-name"), "Globalne");
    await fireEvent.press(screen.getByTestId("exercise-group-select-0"));
    await fireEvent.press(screen.getByTestId("exercise-group-select-0-ABS"));
    await fireEvent.press(screen.getByTestId("exercise-submit"));
    expect(listExercises(db)[0]).toMatchObject({ name: "Globalne", creatorUserId: null });
  });
});

describe("ExerciseFormScreen (edit)", () => {
  it("is pre-filled, validates with the single PWA text and can clear the description", async () => {
    const { db, ctx } = world();
    seedExercise(db, "e1", "Moje", ctx.userId);
    db.update(exercises).set({ description: "stary", muscleGroups: ["CHEST", "ABS"] }).where(eq(exercises.id, "e1")).run();
    await renderThemed(<ExerciseFormScreen editId="e1" />);
    expect(screen.getByText("Edytuj ćwiczenie")).toBeOnTheScreen();
    expect(screen.getByTestId("exercise-name").props.value).toBe("Moje");
    expect(screen.getByTestId("exercise-description").props.value).toBe("stary");
    await fireEvent.changeText(screen.getByTestId("exercise-name"), " ");
    await fireEvent.press(screen.getByTestId("exercise-submit"));
    expect(screen.getByText("Wypełnij nazwę i wybierz przynajmniej jedną grupę mięśniową")).toBeOnTheScreen();
    await fireEvent.changeText(screen.getByTestId("exercise-name"), "Nowa nazwa");
    await fireEvent.changeText(screen.getByTestId("exercise-description"), "");
    await fireEvent.press(screen.getByTestId("exercise-submit"));
    expect(getExercise(db, "e1")).toMatchObject({ name: "Nowa nazwa", description: null, muscleGroups: ["CHEST", "ABS"] });
    expect(mockRouter.back).toHaveBeenCalled();
  });
  it("shows the repository error for someone else's exercise", async () => {
    const { db } = world();
    seedExercise(db, "e2", "Cudze", "other");
    await renderThemed(<ExerciseFormScreen editId="e2" />);
    await fireEvent.press(screen.getByTestId("exercise-submit"));
    expect(screen.getByTestId("exercise-error")).toBeOnTheScreen();
    expect(mockRouter.back).not.toHaveBeenCalled();
  });
});

describe("ExerciseList", () => {
  it("manage mode: edit/delete only for own exercises, admin sees them everywhere; filters and search work", async () => {
    const { db, ctx } = world();
    seedExercise(db, "g", "Globalne", null);
    seedExercise(db, "m", "Moje własne ćw", ctx.userId);
    const onEdit = jest.fn();
    await renderThemed(<ExerciseList mode="manage" onEdit={onEdit} onDelete={jest.fn()} />);
    expect(screen.queryByTestId("exercise-edit-g")).toBeNull();
    await fireEvent.press(screen.getByTestId("exercise-edit-m"));
    expect(onEdit).toHaveBeenCalledWith(expect.objectContaining({ id: "m" }));
    await fireEvent.press(screen.getByTestId("exercise-filter-mine"));
    expect(screen.queryByTestId("exercise-g")).toBeNull();
    expect(screen.getByTestId("exercise-m")).toBeOnTheScreen();
    await fireEvent.press(screen.getByTestId("exercise-filter-mine"));
    await fireEvent.changeText(screen.getByTestId("exercise-search"), "globaln");
    expect(screen.queryByTestId("exercise-m")).toBeNull();
    await fireEvent.changeText(screen.getByTestId("exercise-search"), "zzzzzz");
    expect(screen.getByText("Nie znaleziono ćwiczeń")).toBeOnTheScreen();
  });
  it("select mode: tapping a card selects it", async () => {
    const { db } = world();
    seedExercise(db, "g", "Globalne", null);
    const onSelect = jest.fn();
    await renderThemed(<ExerciseList mode="select" excludeIds={new Set()} onSelect={onSelect} />);
    await fireEvent.press(screen.getByTestId("exercise-g"));
    expect(onSelect).toHaveBeenCalledWith("g");
  });
  it("select mode hides added exercises and says so when nothing is left", async () => {
    const { db } = world();
    seedExercise(db, "g", "Globalne", null);
    await renderThemed(<ExerciseList mode="select" excludeIds={new Set(["g"])} onSelect={jest.fn()} />);
    expect(screen.queryByTestId("exercise-g")).toBeNull();
    expect(screen.getByText("Wszystkie ćwiczenia zostały już dodane")).toBeOnTheScreen();
  });
});

describe("deleteMessage", () => {
  it("is the PWA text, plus the impact when there is any (D-10)", () => {
    expect(deleteMessage("X", { workouts: 0, plans: 0 })).toBe('Czy na pewno chcesz usunąć ćwiczenie "X"?');
    expect(deleteMessage("X", { workouts: 2, plans: 1 })).toContain("treningi: 2, plany: 1");
  });
});
