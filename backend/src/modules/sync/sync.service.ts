import { Prisma } from "@prisma/client";
import { ZodError } from "zod";
import { AppError, BadRequestError, ForbiddenError, NotFoundError } from "../../common/errors.js";
import { runInUserTx } from "../../config/txContext.js";
import * as workoutService from "../workout/workout.service.js";
import * as workoutRepo from "../workout/workout.repository.js";
import { ExerciseService } from "../exercise/exercise.service.js";
import { PlanService, canModify } from "../plan/plan.service.js";
import type { UpdateWorkoutDto } from "../workout/workout.schema.js";
import * as repo from "./sync.repository.js";
import {
  operationSchema,
  type OpOf,
  type OpResult,
  type Operation,
  type OperationType,
  type PushBody,
} from "./sync.schema.js";

/** `startedAt` older than this is a data error (PLAN 5.5). */
export const MAX_START_AGE_MS = 30 * 24 * 60 * 60 * 1000;

interface Ctx {
  userId: string;
  isAdmin: boolean;
  /** Client change time, clamped to server time (a skewed phone clock cannot write the future). */
  at: Date;
  serverNow: Date;
}

type Outcome = "applied" | "superseded";

/** Rejection raised by sync rules themselves (as opposed to the reused services' AppErrors). */
class Reject extends Error {
  constructor(
    readonly code: string,
    message: string,
  ) {
    super(message);
  }
}

const exerciseService = new ExerciseService();
const planService = new PlanService();

// ---- pure helpers (unit tested) ------------------------------------------------------

export const clampAt = (at: Date, serverNow: Date): Date => (at.getTime() > serverNow.getTime() ? serverNow : at);

/** Newer change wins; equal timestamps apply (PLAN 5.5). */
export const isSuperseded = (at: Date, recordUpdatedAt: Date): boolean => at.getTime() < recordUpdatedAt.getTime();

export const isStartTooOld = (startedAt: Date, serverNow: Date): boolean =>
  serverNow.getTime() - startedAt.getTime() > MAX_START_AGE_MS;

/** Maps an error thrown while applying an operation to a per-operation rejection; null = not ours (5xx). */
export const toRejection = (error: unknown): { code: string; message: string } | null => {
  if (error instanceof Reject) return { code: error.code, message: error.message };
  if (error instanceof NotFoundError) return { code: "not_found", message: error.message };
  if (error instanceof ForbiddenError) return { code: "forbidden", message: error.message };
  if (error instanceof BadRequestError) return { code: "bad_request", message: error.message };
  if (error instanceof AppError) return { code: error.status === 409 ? "conflict" : "bad_request", message: error.message };
  if (error instanceof ZodError) {
    const details = error.issues.map((i) => `${i.path.join(".") || "op"}: ${i.message}`).join("; ");
    return { code: "validation", message: `Validation failed: ${details}` };
  }
  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    if (error.code === "P2025") return { code: "not_found", message: "Rekord nie istnieje" };
    if (error.code === "P2003") return { code: "bad_request", message: "Powiązany rekord nie istnieje" };
    if (error.code === "P2002") return { code: "conflict", message: "Rekord już istnieje" };
    // Bad data (value too long / out of range / invalid): permanent, so reject the op instead of a 5xx retry loop.
    if (["P2000", "P2006", "P2007", "P2020", "P2033"].includes(error.code)) return { code: "bad_request", message: "Nieprawidłowa wartość" };
  }
  if (error instanceof Prisma.PrismaClientValidationError) return { code: "validation", message: "Nieprawidłowa wartość" };
  return null;
};

const entityOf = (type: string): "workout" | "item" | "set" | "exercise" | "plan" => {
  const prefix = type.split(".")[0];
  return prefix === "item" || prefix === "set" || prefix === "exercise" || prefix === "plan" ? prefix : "workout";
};

// ---- handlers -----------------------------------------------------------------------

const wo = (updatedAt: Date) => ({ updatedAt });

const assertFound = <T>(head: T | null): T => {
  if (!head) throw new NotFoundError("Trening nie znaleziony");
  return head;
};

const workoutHandlers = {
  "workout.create": async (op: OpOf<"workout.create">, c: Ctx): Promise<Outcome> => {
    const existing = await repo.findWorkoutHead(op.id);
    if (existing) {
      if (existing.userId !== c.userId) throw new ForbiddenError("Brak uprawnień do tego treningu");
      return "applied"; // idempotent create
    }

    const startedAt = new Date(op.startedAt);
    if (isStartTooOld(startedAt, c.serverNow)) {
      throw new Reject("stale_start", "Czas startu treningu jest starszy niż 30 dni");
    }
    const createdAt = clampAt(startedAt, c.serverNow);

    if (op.workoutPlanId) {
      // Throws NotFoundError when the plan is not visible to the user (same as POST /api/workouts).
      await planService.getPlanById(op.workoutPlanId, c.userId);
    }

    await workoutRepo.createWorkout({
      id: op.id,
      workoutDate: new Date(op.workoutDate),
      workoutName: op.workoutName ?? null,
      gymName: op.gymName ?? null,
      location: null,
      workoutNotes: null,
      user: { connect: { id: c.userId } },
      ...(op.workoutPlanId && { plan: { connect: { id: op.workoutPlanId } } }),
      createdAt,
      updatedAt: c.at,
    });

    // Single active workout (PLAN 5.5): the workout is always created; the later start is
    // the active one, the earlier stays a DRAFT. No set is ever lost.
    const activeId = (await workoutRepo.getActiveWorkout(c.userId))?.activeWorkoutId ?? null;
    let makeActive = true;
    if (activeId) {
      const active = await repo.findWorkoutHead(activeId);
      if (active && active.status === "DRAFT" && active.createdAt.getTime() > createdAt.getTime()) {
        makeActive = false;
      }
    }
    if (makeActive) await workoutRepo.setActiveWorkout(c.userId, op.id);
    return "applied";
  },

  "workout.update": async (op: OpOf<"workout.update">, c: Ctx): Promise<Outcome> => {
    const head = assertFound(await repo.findWorkoutHead(op.id));
    if (head.userId !== c.userId) throw new ForbiddenError("Brak uprawnień do tego treningu");
    if (isSuperseded(c.at, head.updatedAt)) return "superseded";

    const data = {
      ...(op.workoutDate !== undefined && { workoutDate: op.workoutDate }),
      ...(op.workoutName !== undefined && { workoutName: op.workoutName }),
      ...(op.gymName !== undefined && { gymName: op.gymName }),
      ...(op.workoutNotes !== undefined && { workoutNotes: op.workoutNotes }),
      ...(op.durationSeconds !== undefined && { durationSeconds: op.durationSeconds }),
    } as UpdateWorkoutDto;
    await workoutService.updateWorkout(op.id, c.userId, data, wo(c.at));
    return "applied";
  },

  "workout.complete": async (op: OpOf<"workout.complete">, c: Ctx): Promise<Outcome> => {
    const head = assertFound(await repo.findWorkoutHead(op.id));
    if (head.userId !== c.userId) throw new ForbiddenError("Brak uprawnień do tego treningu");
    if (isSuperseded(c.at, head.updatedAt)) return "superseded";

    const activeBefore = (await workoutRepo.getActiveWorkout(c.userId))?.activeWorkoutId ?? null;
    // Rebuilds stats and syncs pending notes through the existing service.
    await workoutService.updateWorkout(
      op.id,
      c.userId,
      { status: "COMPLETED", durationSeconds: op.durationSeconds },
      wo(c.at),
    );
    // The service clears the active pointer unconditionally; completing an OLDER draft must not
    // drop the newer active workout.
    if (activeBefore && activeBefore !== op.id) {
      const active = await repo.findWorkoutHead(activeBefore);
      if (active?.status === "DRAFT") await workoutRepo.setActiveWorkout(c.userId, activeBefore);
    }
    return "applied";
  },

  "workout.delete": async (op: OpOf<"workout.delete">, c: Ctx): Promise<Outcome> => {
    const head = await repo.findWorkoutHead(op.id);
    if (!head) return "applied"; // deleting a missing record succeeds
    if (head.userId !== c.userId) throw new ForbiddenError("Brak uprawnień do tego treningu");
    await workoutService.deleteWorkout(op.id, c.userId); // rebuilds stats
    return "applied";
  },

  "workout.skipPlanExercise": async (op: OpOf<"workout.skipPlanExercise">, c: Ctx): Promise<Outcome> => {
    const head = await repo.findWorkoutHead(op.id);
    if (head && head.userId === c.userId && isSuperseded(c.at, head.updatedAt)) return "superseded";
    // Not found / foreign / no plan / exercise not in plan: the service throws the usual errors.
    await workoutService.skipPlanExercise(op.id, c.userId, op.exerciseId, wo(c.at));
    return "applied";
  },
};

const itemHandlers = {
  "item.add": async (op: OpOf<"item.add">, c: Ctx): Promise<Outcome> => {
    const existing = await repo.findItemHead(op.id);
    if (existing) {
      if (existing.workout.userId !== c.userId) throw new ForbiddenError("Brak uprawnień");
      return "applied";
    }
    // Same as the PWA path the workout must be the user's own (service: NotFound / Forbidden).
    await workoutService.getWorkoutById(op.workoutId, c.userId);
    if (!(await repo.findCurrent("exercise", op.exerciseId, c.userId))) {
      throw new NotFoundError("Exercise not found");
    }
    await workoutService.addExerciseToWorkout(
      op.workoutId,
      c.userId,
      { exerciseId: op.exerciseId, orderInWorkout: op.orderInWorkout },
      { id: op.id, createdAt: c.at, updatedAt: c.at },
    );
    return "applied";
  },

  "item.update": async (op: OpOf<"item.update">, c: Ctx): Promise<Outcome> => {
    const head = await repo.findItemHead(op.id);
    if (!head) throw new NotFoundError("Pozycja treningowa nie znaleziona");
    if (head.workout.userId !== c.userId) throw new ForbiddenError("Brak uprawnień");
    if (isSuperseded(c.at, head.updatedAt)) return "superseded";
    // Pending-note sync and stats rebuild (completed workout) happen inside the service.
    await workoutService.updateWorkoutItem(op.id, c.userId, { notes: op.notes } as never, wo(c.at));
    return "applied";
  },

  "item.delete": async (op: OpOf<"item.delete">, c: Ctx): Promise<Outcome> => {
    const head = await repo.findItemHead(op.id);
    if (!head) return "applied";
    if (head.workout.userId !== c.userId) throw new ForbiddenError("Brak uprawnień");
    await workoutService.deleteWorkoutItem(op.id, c.userId);
    return "applied";
  },
};

const setHandlers = {
  "set.add": async (op: OpOf<"set.add">, c: Ctx): Promise<Outcome> => {
    const existing = await repo.findSetHead(op.id);
    if (existing) {
      if (existing.item.workout.userId !== c.userId) throw new ForbiddenError("Brak uprawnień");
      return "applied";
    }
    await workoutService.addSetToWorkoutItem(
      op.itemId,
      c.userId,
      { weight: op.weight, repetitions: op.repetitions },
      { id: op.id, createdAt: c.at, updatedAt: c.at, setNumber: op.setNumber },
    );
    return "applied";
  },

  "set.update": async (op: OpOf<"set.update">, c: Ctx): Promise<Outcome> => {
    const head = await repo.findSetHead(op.id);
    if (!head) throw new NotFoundError("Nie znaleziono serii");
    if (head.item.workout.userId !== c.userId) throw new ForbiddenError("Brak uprawnień");
    if (isSuperseded(c.at, head.updatedAt)) return "superseded";
    await workoutService.updateWorkoutSet(
      op.id,
      c.userId,
      {
        ...(op.weight !== undefined && { weight: op.weight }),
        ...(op.repetitions !== undefined && { repetitions: op.repetitions }),
      },
      wo(c.at),
    );
    return "applied";
  },

  "set.delete": async (op: OpOf<"set.delete">, c: Ctx): Promise<Outcome> => {
    const head = await repo.findSetHead(op.id);
    if (!head) return "applied";
    if (head.item.workout.userId !== c.userId) throw new ForbiddenError("Brak uprawnień");
    await workoutService.deleteWorkoutSet(op.id, c.userId);
    return "applied";
  },
};

const exerciseHandlers = {
  "exercise.create": async (op: OpOf<"exercise.create">, c: Ctx): Promise<Outcome> => {
    if (op.isGlobal && !c.isAdmin) throw new ForbiddenError("Brak uprawnień do tworzenia globalnych ćwiczeń");
    const existing = await repo.findExerciseHead(op.id);
    if (existing) {
      const own = existing.creatorUserId === c.userId || (c.isAdmin && existing.creatorUserId === null);
      if (!own) throw new ForbiddenError("Unauthorized: You can only edit your own exercises");
      return "applied";
    }
    await exerciseService.createExercise(
      {
        name: op.name,
        muscleGroups: op.muscleGroups,
        ...(op.description != null && { description: op.description }),
        ...(op.isGlobal !== undefined && { isGlobal: op.isGlobal }),
        userId: c.userId,
      },
      { id: op.id, createdAt: c.at, updatedAt: c.at },
    );
    return "applied";
  },

  "exercise.update": async (op: OpOf<"exercise.update">, c: Ctx): Promise<Outcome> => {
    const head = await repo.findExerciseHead(op.id);
    if (!head) throw new NotFoundError("Exercise not found");
    if (!c.isAdmin && head.creatorUserId !== c.userId) {
      throw new ForbiddenError("Unauthorized: You can only edit your own exercises");
    }
    if (isSuperseded(c.at, head.updatedAt)) return "superseded";
    await exerciseService.updateExercise(
      op.id,
      {
        ...(op.name !== undefined && { name: op.name }),
        ...(op.muscleGroups !== undefined && { muscleGroups: op.muscleGroups }),
        ...(op.description !== undefined && { description: op.description }),
      } as never,
      c.userId,
      c.isAdmin,
      wo(c.at),
    );
    return "applied";
  },

  "exercise.delete": async (op: OpOf<"exercise.delete">, c: Ctx): Promise<Outcome> => {
    const head = await repo.findExerciseHead(op.id);
    if (!head) return "applied";
    // Cascades to workout items, stats and plan items exactly like DELETE /api/exercises/:id.
    await exerciseService.deleteExercise(op.id, c.userId, c.isAdmin);
    return "applied";
  },
};

const planHandlers = {
  "plan.create": async (op: OpOf<"plan.create">, c: Ctx): Promise<Outcome> => {
    const existing = await repo.findPlanHead(op.id);
    if (existing) {
      if (!canModify(existing, c.userId, c.isAdmin)) throw new ForbiddenError("You can only edit your own plans");
      return "applied";
    }
    await planService.createPlan(
      {
        name: op.name,
        ...(op.shortName !== undefined && { shortName: op.shortName }),
        exerciseIds: op.exerciseIds,
        isPublic: op.isPublic,
        ...(op.isGlobal !== undefined && { isGlobal: op.isGlobal }),
      },
      c.userId,
      c.isAdmin,
      { id: op.id, createdAt: c.at, updatedAt: c.at },
    );
    return "applied";
  },

  "plan.update": async (op: OpOf<"plan.update">, c: Ctx): Promise<Outcome> => {
    const head = await repo.findPlanHead(op.id);
    if (!head) throw new NotFoundError("Plan not found");
    if (!canModify(head, c.userId, c.isAdmin)) throw new ForbiddenError("You can only edit your own plans");
    if (isSuperseded(c.at, head.updatedAt)) return "superseded";
    await planService.updatePlan(
      op.id,
      {
        ...(op.name !== undefined && { name: op.name }),
        ...(op.shortName !== undefined && { shortName: op.shortName }),
        ...(op.exerciseIds !== undefined && { exerciseIds: op.exerciseIds }),
        ...(op.isPublic !== undefined && { isPublic: op.isPublic }),
        ...(op.isGlobal !== undefined && { isGlobal: op.isGlobal }),
      },
      c.userId,
      c.isAdmin,
      wo(c.at),
    );
    return "applied";
  },

  "plan.delete": async (op: OpOf<"plan.delete">, c: Ctx): Promise<Outcome> => {
    const head = await repo.findPlanHead(op.id);
    if (!head) return "applied";
    await planService.deletePlan(op.id, c.userId, c.isAdmin);
    return "applied";
  },

  "plan.duplicate": async (op: OpOf<"plan.duplicate">, c: Ctx): Promise<Outcome> => {
    const existing = await repo.findPlanHead(op.id);
    if (existing) {
      if (!canModify(existing, c.userId, c.isAdmin)) throw new ForbiddenError("You can only edit your own plans");
      return "applied";
    }
    await planService.duplicatePlan(op.sourceId, c.userId, op.name, {
      id: op.id,
      createdAt: c.at,
      updatedAt: c.at,
    });
    return "applied";
  },

  "plan.favorite": async (op: OpOf<"plan.favorite">, c: Ctx): Promise<Outcome> => {
    await planService.favoritePlan(op.id, c.userId);
    return "applied";
  },

  "plan.unfavorite": async (op: OpOf<"plan.unfavorite">, c: Ctx): Promise<Outcome> => {
    try {
      await planService.unfavoritePlan(op.id, c.userId);
    } catch (error) {
      if (!(error instanceof NotFoundError)) throw error; // nothing to unfavorite
    }
    return "applied";
  },
};

type Handlers = { [T in OperationType]: (op: OpOf<T>, c: Ctx) => Promise<Outcome> };

const handlers: Handlers = {
  ...workoutHandlers,
  ...itemHandlers,
  ...setHandlers,
  ...exerciseHandlers,
  ...planHandlers,
};

const run = <T extends OperationType>(op: OpOf<T>, c: Ctx): Promise<Outcome> =>
  (handlers[op.type as T] as (op: OpOf<T>, c: Ctx) => Promise<Outcome>)(op, c);

// ---- pipeline -----------------------------------------------------------------------

const storeResult = (userId: string, deviceId: string, type: string, result: OpResult) =>
  repo.saveOperation({
    opId: result.opId,
    userId,
    deviceId,
    type,
    status: result.status,
    result: JSON.parse(JSON.stringify(result)) as Prisma.InputJsonValue,
  });

/** A stored `applied` result replays as `duplicate`; rejected / superseded replay unchanged. */
const replayOf = (stored: { result: unknown }): OpResult => {
  const result = stored.result as OpResult;
  return result.status === "applied" ? { ...result, status: "duplicate" } : result;
};

type Envelope = PushBody["ops"][number];

const processOne = async (
  userId: string,
  isAdmin: boolean,
  deviceId: string,
  raw: Envelope,
  serverNow: Date,
): Promise<OpResult> => {
  const opId = raw.opId;
  const type = raw.type;

  // Phase 1: replay check + handler in one transaction that starts with the user-row lock.
  // A rejection (thrown) rolls back everything the handler wrote.
  try {
    return await runInUserTx(userId, async () => {
      const stored = await repo.findOperation(opId);
      if (stored) {
        if (stored.userId !== userId) throw new Reject("forbidden", "Identyfikator operacji jest już zajęty");
        return replayOf(stored);
      }

      const parsed = operationSchema.parse(raw) as Operation; // ZodError -> rejected (validation)
      const at = clampAt(new Date(parsed.at), serverNow);
      const outcome = await run(parsed, { userId, isAdmin, at, serverNow });

      const result: OpResult = { opId, status: outcome };
      if (outcome === "superseded") result.current = await currentOf(type, parsed, userId);
      await storeResult(userId, deviceId, type, result);
      return result;
    });
  } catch (error) {
    const rejection = toRejection(error);
    if (!rejection) throw error;

    // Phase 2: persist the rejection so a replay returns the same answer.
    return runInUserTx(userId, async () => {
      const stored = await repo.findOperation(opId);
      if (stored) return stored.userId === userId ? replayOf(stored) : unknownOpResult(opId, rejection);

      const id = (raw as { id?: unknown }).id;
      const current = typeof id === "string" ? await repo.findCurrent(entityOf(type), id, userId) : null;
      const result: OpResult = {
        opId,
        status: "rejected",
        code: rejection.code,
        error: rejection.message,
        current: current ?? null,
      };
      await storeResult(userId, deviceId, type, result);
      return result;
    });
  }
};

const unknownOpResult = (opId: string, r: { code: string; message: string }): OpResult => ({
  opId,
  status: "rejected",
  code: r.code,
  error: r.message,
  current: null,
});

const currentOf = async (type: string, op: Operation, userId: string) =>
  (await repo.findCurrent(entityOf(type), op.id, userId)) ?? null;

export const push = async (userId: string, isAdmin: boolean, body: PushBody) => {
  const serverNow = new Date();
  const results: OpResult[] = [];
  // Sequential on purpose: operations of one device depend on each other (item before set).
  for (const raw of body.ops) {
    if (!isKnownType(raw.type)) {
      results.push(await rejectUnknownType(userId, body.deviceId, raw));
      continue;
    }
    results.push(await processOne(userId, isAdmin, body.deviceId, raw, serverNow));
  }
  return { serverTime: serverNow.toISOString(), results };
};

const KNOWN_TYPES = new Set<string>(Object.keys(handlers));
const isKnownType = (type: string) => KNOWN_TYPES.has(type);

const rejectUnknownType = (userId: string, deviceId: string, raw: Envelope) =>
  runInUserTx(userId, async () => {
    const stored = await repo.findOperation(raw.opId);
    if (stored) return stored.userId === userId ? replayOf(stored) : unknownOpResult(raw.opId, { code: "forbidden", message: "Identyfikator operacji jest już zajęty" });
    const result = unknownOpResult(raw.opId, { code: "unknown_type", message: `Nieznany typ operacji: ${raw.type}` });
    await storeResult(userId, deviceId, raw.type, result);
    return result;
  });
