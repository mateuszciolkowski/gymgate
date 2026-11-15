import { z } from "zod";
import { MuscleGroup } from "@prisma/client";

/** Max operations per push request (PLAN 5.3). */
export const MAX_PUSH_OPS = 100;

/**
 * Envelope only: a malformed single operation must be REJECTED individually
 * (result per operation), not fail the whole request, so the per-type payload
 * is validated later by `parseOperation`.
 */
export const pushSchema = z.object({
  body: z.object({
    deviceId: z.string().min(1).max(128),
    ops: z
      .array(
        z.looseObject({
          opId: z.string().min(1).max(64),
          type: z.string().max(64),
        }),
      )
      .min(1, "At least one operation is required")
      .max(MAX_PUSH_OPS, `At most ${MAX_PUSH_OPS} operations per request`),
  }),
});

export type PushBody = z.infer<typeof pushSchema>["body"];

/** GET /api/sync/pull: no params = snapshot page 1; `snapshotToken` = next snapshot page; `cursor` = incremental. */
export const pullSchema = z.object({
  query: z
    .object({
      cursor: z.string().min(1).max(100).optional(),
      snapshotToken: z.string().min(1).max(500).optional(),
    })
    .refine((q) => !(q.cursor && q.snapshotToken), "Podaj cursor albo snapshotToken, nie oba"),
});

export type PullQuery = z.infer<typeof pullSchema>["query"];

const iso = z.string().datetime({ offset: true });
const id = z.string().uuid();
// Decimal(6,2) on the server; the device may send a number or a decimal string.
const weight = z
  .union([z.number(), z.string().regex(/^\d+(\.\d+)?$/, "Invalid weight")])
  .transform((v) => Number(v))
  .pipe(z.number().nonnegative().max(9999.99));
const reps = z.number().int().positive();

const base = { opId: z.string(), at: iso };

const op = <T extends string, S extends z.ZodRawShape>(type: T, shape: S) =>
  z.object({ ...base, type: z.literal(type), ...shape });

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
    name: z.string().min(1, "Name is required").max(200),
    muscleGroups: z.array(z.nativeEnum(MuscleGroup)).min(1, "At least one muscle group is required"),
    description: z.string().nullish(),
    isGlobal: z.boolean().optional(),
  }),
  op("exercise.update", {
    id,
    name: z.string().min(1).max(200).optional(),
    muscleGroups: z.array(z.nativeEnum(MuscleGroup)).min(1).optional(),
    description: z.string().nullable().optional(),
  }),
  op("exercise.delete", { id }),
  // Same limits as createPlanSchema / updatePlanSchema (plan.schema.ts).
  op("plan.create", {
    id,
    name: z.string().min(3, "Name must be at least 3 characters").max(100, "Name must be at most 100 characters"),
    shortName: z.string().max(50).nullish(),
    exerciseIds: z
      .array(z.string().uuid())
      .min(1, "At least one exercise is required")
      .max(50, "At most 50 exercises are allowed")
      .refine((ids) => new Set(ids).size === ids.length, "Exercise IDs must be unique"),
    isPublic: z.boolean().default(false),
    isGlobal: z.boolean().optional(),
  }),
  op("plan.update", {
    id,
    name: z.string().min(3).max(100).optional(),
    shortName: z.string().max(50).nullable().optional(),
    exerciseIds: z
      .array(z.string().uuid())
      .min(1)
      .max(50)
      .refine((ids) => new Set(ids).size === ids.length, "Exercise IDs must be unique")
      .optional(),
    isPublic: z.boolean().optional(),
    isGlobal: z.boolean().optional(),
  }),
  op("plan.delete", { id }),
  op("plan.duplicate", { id, sourceId: id, name: z.string().min(3).max(100) }),
  op("plan.favorite", { id }),
  op("plan.unfavorite", { id }),
]);

export type Operation = z.infer<typeof operationSchema>;
export type OperationType = Operation["type"];
export type OpOf<T extends OperationType> = Extract<Operation, { type: T }>;

export type OpStatus = "applied" | "duplicate" | "superseded" | "rejected";

export interface OpResult {
  opId: string;
  status: OpStatus;
  /** Machine-readable reason for `rejected` (validation, not_found, forbidden, conflict, bad_request, ...). */
  code?: string;
  error?: string;
  /** Server-side state of the record (null = absent / not visible). Only for rejected / superseded. */
  current?: unknown;
}
