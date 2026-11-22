import { MUSCLE_GROUPS } from "./muscleGroups";
import { toHundredths } from "./weight";

/**
 * Local equivalents of server validations so rejections stay rare (MIGRACJA 6.5).
 * Messages are the ones the server / PWA show: set form (DraftSetRow.tsx), exercise forms
 * (AddExerciseScreen/EditExerciseScreen), plan form (PlanFormScreen.tsx), plan.service.ts and
 * sync.schema.ts for the rest.
 */
export class ValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ValidationError";
  }
}

const fail = (message: string): never => {
  throw new ValidationError(message);
};

const MUSCLE_VALUES: ReadonlySet<string> = new Set(MUSCLE_GROUPS.map((g) => g.value));

// ---- sets ----

const SET_MESSAGE = "Wpisz poprawny ciężar (≥0) i powtórzenia (≥1)";

/** weight >= 0 in 0.5 kg steps (PWA `step="0.5"`), <= 9999.99 (Decimal(6,2)). */
export function validateWeight(weight: string | number): void {
  const w = typeof weight === "string" ? (weight.trim() === "" ? NaN : Number(weight)) : weight;
  const h = toHundredths(w);
  if (!Number.isFinite(w) || w < 0 || h % 50 !== 0 || h > 999999) fail(SET_MESSAGE);
}

/** Integer >= 1. */
export function validateReps(repetitions: number): void {
  if (!Number.isInteger(repetitions) || repetitions < 1 || repetitions > 10_000) fail(SET_MESSAGE);
}

export function validateSet(weight: string | number, repetitions: number): void {
  validateWeight(weight);
  validateReps(repetitions);
}

// ---- workout completion ----

interface CompletableWorkout {
  items: Array<{ exercise: { name: string }; sets: unknown[] }>;
}

/** At least one exercise, and every exercise needs a set (WorkoutDetailScreen.handleCompleteWorkout). Null = OK. */
export function completionError(workout: CompletableWorkout): string | null {
  if (workout.items.length === 0) return "Dodaj przynajmniej jedno ćwiczenie przed zakończeniem treningu.";
  const empty = workout.items.find((i) => i.sets.length === 0);
  if (empty) return `Ćwiczenie "${empty.exercise.name}" nie ma żadnych serii. Dodaj serię lub usuń to ćwiczenie.`;
  return null;
}

// ---- exercises ----

export interface ExerciseFields {
  name?: string;
  muscleGroups?: string[];
}

/** Create requires both fields; update only checks the ones present (sync.schema.ts: name 1..200, >= 1 group). */
export function validateExercise(fields: ExerciseFields, mode: "create" | "update"): void {
  if (mode === "create" || fields.name !== undefined) {
    const name = fields.name?.trim() ?? "";
    if (name.length === 0) fail("Nazwa ćwiczenia jest wymagana");
    if (name.length > 200) fail("Nazwa ćwiczenia może mieć maksymalnie 200 znaków");
  }
  if (mode === "create" || fields.muscleGroups !== undefined) {
    const groups = fields.muscleGroups ?? [];
    if (groups.length === 0) fail("Wybierz przynajmniej jedną grupę mięśniową");
    if (groups.some((g) => !MUSCLE_VALUES.has(g))) fail("Nieprawidłowa grupa mięśniowa");
  }
}

// ---- plans ----

export const MAX_COPY_SUFFIX = 999;

export function validatePlanName(name: string): void {
  const n = name.trim();
  if (n.length < 3) fail("Nazwa planu musi mieć co najmniej 3 znaki");
  if (n.length > 100) fail("Nazwa planu może mieć maksymalnie 100 znaków");
}

export function validatePlanExerciseIds(ids: string[]): void {
  if (ids.length === 0) fail("Dodaj co najmniej 1 ćwiczenie");
  if (ids.length > 50) fail("At most 50 exercises are allowed");
  if (new Set(ids).size !== ids.length) fail("Exercise IDs must be unique");
}

/** Server message of plan.service.ts for a public plan with private exercises. */
export function assertPublicPlanExercises(exercises: Array<{ name: string; creatorUserId: string | null }>): void {
  const privateOnes = exercises.filter((e) => e.creatorUserId !== null && e.creatorUserId !== "1");
  if (privateOnes.length > 0) {
    fail(`Cannot make plan public: contains private exercises (${privateOnes.map((e) => e.name).join(", ")})`);
  }
}

export const planNameTakenMessage = (isGlobal: boolean): string =>
  isGlobal ? "Global plan with this name already exists" : "Plan with this name already exists";

/** "X (kopia)", "X (kopia 2)", ... first name not in `taken` (plan.service.ts findFreeCopyName). */
export function freeCopyName(baseName: string, taken: ReadonlySet<string>): string {
  let candidate = `${baseName} (kopia)`;
  let counter = 2;
  while (taken.has(candidate)) {
    if (counter > MAX_COPY_SUFFIX) fail("Cannot generate unique name for plan copy — please rename manually");
    candidate = `${baseName} (kopia ${counter})`;
    counter += 1;
  }
  return candidate;
}
