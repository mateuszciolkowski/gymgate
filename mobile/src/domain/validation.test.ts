import {
  assertPublicPlanExercises,
  completionError,
  freeCopyName,
  planNameTakenMessage,
  validateExercise,
  validatePlanExerciseIds,
  validatePlanName,
  validateSet,
  ValidationError,
} from "./validation";
import { fromHundredths, normalizeWeight, toHundredths } from "./weight";

describe("validateSet", () => {
  it.each([[0, 1], [60, 5], ["62.5", 3], [9999.5, 1]])("accepts %s x %s", (w, r) => {
    expect(() => validateSet(w, r)).not.toThrow();
  });
  it.each([[-0.5, 1], ["", 1], ["abc", 1], [10.25, 1], [60, 0], [60, 1.5], [10000, 1]])("rejects %s x %s", (w, r) => {
    expect(() => validateSet(w, r)).toThrow("Wpisz poprawny ciężar (≥0) i powtórzenia (≥1)");
  });
});

describe("completionError", () => {
  const ex = (name: string, sets: number) => ({ exercise: { name }, sets: Array.from({ length: sets }) });
  it("needs an exercise and a set in every exercise", () => {
    expect(completionError({ items: [] })).toBe("Dodaj przynajmniej jedno ćwiczenie przed zakończeniem treningu.");
    expect(completionError({ items: [ex("A", 1), ex("B", 0)] })).toBe('Ćwiczenie "B" nie ma żadnych serii. Dodaj serię lub usuń to ćwiczenie.');
    expect(completionError({ items: [ex("A", 1)] })).toBeNull();
  });
});

describe("exercise / plan validation", () => {
  it("exercise fields", () => {
    expect(() => validateExercise({ name: "A", muscleGroups: ["CHEST"] }, "create")).not.toThrow();
    expect(() => validateExercise({ name: "", muscleGroups: ["CHEST"] }, "create")).toThrow("Nazwa ćwiczenia jest wymagana");
    expect(() => validateExercise({ name: "a".repeat(201), muscleGroups: ["CHEST"] }, "create")).toThrow(ValidationError);
    expect(() => validateExercise({ name: "A", muscleGroups: ["LEGS"] }, "create")).toThrow("Nieprawidłowa grupa mięśniowa");
    expect(() => validateExercise({ description: "only" } as never, "update")).not.toThrow();
    expect(() => validateExercise({ muscleGroups: [] }, "update")).toThrow("Wybierz przynajmniej jedną grupę mięśniową");
  });

  it("plan name and exercise ids", () => {
    expect(() => validatePlanName("abc")).not.toThrow();
    expect(() => validatePlanName("  ab ")).toThrow("Nazwa planu musi mieć co najmniej 3 znaki");
    expect(() => validatePlanName("a".repeat(101))).toThrow("Nazwa planu może mieć maksymalnie 100 znaków");
    expect(() => validatePlanExerciseIds([])).toThrow("Dodaj co najmniej 1 ćwiczenie");
    expect(() => validatePlanExerciseIds(["a", "a"])).toThrow("Exercise IDs must be unique");
    expect(() => validatePlanExerciseIds(Array.from({ length: 51 }, (_, i) => String(i)))).toThrow("At most 50 exercises are allowed");
  });

  it("public plan needs global exercises (null or '1'), message lists the private ones", () => {
    expect(() => assertPublicPlanExercises([{ name: "A", creatorUserId: null }, { name: "B", creatorUserId: "1" }])).not.toThrow();
    expect(() => assertPublicPlanExercises([{ name: "A", creatorUserId: "u" }, { name: "B", creatorUserId: "v" }])).toThrow(
      "Cannot make plan public: contains private exercises (A, B)",
    );
    expect(planNameTakenMessage(true)).toBe("Global plan with this name already exists");
  });

  it("copy names", () => {
    expect(freeCopyName("X", new Set())).toBe("X (kopia)");
    expect(freeCopyName("X", new Set(["X (kopia)"]))).toBe("X (kopia 2)");
    expect(freeCopyName("X", new Set(["X (kopia)", "X (kopia 2)", "X (kopia 4)"]))).toBe("X (kopia 3)");
    const all = new Set(["X (kopia)", ...Array.from({ length: 997 }, (_, i) => `X (kopia ${i + 2})`)]);
    expect(freeCopyName("X", all)).toBe("X (kopia 999)"); // 999 is the last allowed suffix
    all.add("X (kopia 999)");
    expect(() => freeCopyName("X", all)).toThrow("Cannot generate unique name for plan copy — please rename manually");
  });
});

describe("weight", () => {
  it("hundredths round trip and canonical text", () => {
    expect(toHundredths("62.5")).toBe(6250);
    expect(toHundredths(0.29)).toBe(29);
    expect(fromHundredths(6000)).toBe("60");
    expect(normalizeWeight("62.50")).toBe("62.5");
    expect(normalizeWeight(60)).toBe("60");
  });
});
