// Test fixture: copy of the push operation schema from backend/src/modules/sync/sync.schema.ts
// (mobile must not import backend code). Keep in sync with that file; used only by tests.
import { z } from "zod";
import { MUSCLE_GROUPS } from "../domain/muscleGroups";

const iso = z.string().datetime({ offset: true });
const id = z.string().uuid();
const weight = z
  .union([z.number(), z.string().regex(/^\d+(\.\d+)?$/, "Invalid weight")])
  .transform((v) => Number(v))
  .pipe(z.number().nonnegative().max(9999.99));
const reps = z.number().int().positive();
const muscle = z.enum(MUSCLE_GROUPS.map((g) => g.value) as [string, ...string[]]);
const base = { opId: z.string(), at: iso };
const op = <T extends string, S extends z.ZodRawShape>(type: T, shape: S) =>
  z.strictObject({ ...base, type: z.literal(type), ...shape });

const exerciseIds = (min = 1) =>
  z
    .array(z.string().uuid())
    .min(min)
    .max(50)
    .refine((ids) => new Set(ids).size === ids.length, "Exercise IDs must be unique");

export const operationSchema = z.discriminatedUnion("type", [
  op("workout.create", {
    id,
    workoutDate: iso,
    workoutName: z.string().nullish(),
    gymName: z.string().nullish(),
    workoutPlanId: id.nullish(),
    startedAt: iso,
  }),
  op("workout.update", {
    id,
    workoutDate: iso.optional(),
    workoutName: z.string().nullable().optional(),
    gymName: z.string().nullable().optional(),
    workoutNotes: z.string().nullable().optional(),
    durationSeconds: z.number().int().nonnegative().optional(),
  }),
  op("workout.complete", { id, durationSeconds: z.number().int().nonnegative() }),
  op("workout.delete", { id }),
  op("workout.skipPlanExercise", { id, exerciseId: id }),
  op("item.add", { id, workoutId: id, exerciseId: id, orderInWorkout: z.number().int().positive() }),
  op("item.update", { id, notes: z.string().nullable() }),
  op("item.delete", { id }),
  op("set.add", { id, itemId: id, setNumber: z.number().int().positive(), weight, repetitions: reps }),
  op("set.update", { id, weight: weight.optional(), repetitions: reps.optional() }),
  op("set.delete", { id }),
  op("exercise.create", {
    id,
    name: z.string().min(1).max(200),
    muscleGroups: z.array(muscle).min(1),
    description: z.string().nullish(),
    isGlobal: z.boolean().optional(),
  }),
  op("exercise.update", {
    id,
    name: z.string().min(1).max(200).optional(),
    muscleGroups: z.array(muscle).min(1).optional(),
    description: z.string().nullable().optional(),
  }),
  op("exercise.delete", { id }),
  op("plan.create", {
    id,
    name: z.string().min(3).max(100),
    shortName: z.string().max(50).nullish(),
    exerciseIds: exerciseIds(),
    isPublic: z.boolean().default(false),
    isGlobal: z.boolean().optional(),
  }),
  op("plan.update", {
    id,
    name: z.string().min(3).max(100).optional(),
    shortName: z.string().max(50).nullable().optional(),
    exerciseIds: exerciseIds().optional(),
    isPublic: z.boolean().optional(),
    isGlobal: z.boolean().optional(),
  }),
  op("plan.delete", { id }),
  op("plan.duplicate", { id, sourceId: id, name: z.string().min(3).max(100) }),
  op("plan.favorite", { id }),
  op("plan.unfavorite", { id }),
]);
