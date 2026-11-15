import { sql } from "drizzle-orm";
import { index, integer, sqliteTable, text, uniqueIndex } from "drizzle-orm/sqlite-core";

// Timestamps are ISO-8601 UTC strings with milliseconds (what the server sends), so text order == time order.
// No foreign keys on purpose: cascades are done by repositories (PLAN 4.3) and pull may apply rows in any order.

export const workouts = sqliteTable(
  "workouts",
  {
    id: text("id").primaryKey(),
    userId: text("user_id").notNull(),
    workoutDate: text("workout_date").notNull(),
    status: text("status", { enum: ["DRAFT", "COMPLETED"] }).notNull(),
    workoutName: text("workout_name"),
    gymName: text("gym_name"),
    location: text("location"),
    workoutNotes: text("workout_notes"),
    durationSeconds: integer("duration_seconds"),
    workoutPlanId: text("workout_plan_id"),
    skippedPlanExerciseIds: text("skipped_plan_exercise_ids", { mode: "json" })
      .$type<string[]>()
      .notNull()
      .default(sql`'[]'`),
    createdAt: text("created_at").notNull(),
    updatedAt: text("updated_at").notNull(),
  },
  (t) => [index("workouts_status_idx").on(t.status), index("workouts_plan_idx").on(t.workoutPlanId)],
);

export const workoutItems = sqliteTable(
  "workout_items",
  {
    id: text("id").primaryKey(),
    workoutId: text("workout_id").notNull(),
    exerciseId: text("exercise_id").notNull(),
    orderInWorkout: integer("order_in_workout").notNull(),
    notes: text("notes"),
    previousNote: text("previous_note"),
    createdAt: text("created_at").notNull(),
    updatedAt: text("updated_at").notNull(),
  },
  (t) => [index("workout_items_workout_idx").on(t.workoutId), index("workout_items_exercise_idx").on(t.exerciseId)],
);

export const workoutSets = sqliteTable(
  "workout_sets",
  {
    id: text("id").primaryKey(),
    itemId: text("item_id").notNull(),
    setNumber: integer("set_number").notNull(),
    /** Decimal text exactly like the server ("62.5", "60"). Arithmetic is done in hundredths (domain/weight.ts). */
    weight: text("weight").notNull(),
    repetitions: integer("repetitions").notNull(),
    createdAt: text("created_at").notNull(),
    updatedAt: text("updated_at").notNull(),
  },
  (t) => [index("workout_sets_item_idx").on(t.itemId)],
);

export const exercises = sqliteTable("exercises", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  muscleGroups: text("muscle_groups", { mode: "json" }).$type<string[]>().notNull(),
  description: text("description"),
  creatorUserId: text("creator_user_id"),
  photos: text("photos", { mode: "json" })
    .$type<Array<{ id: string; photoStage: string; photoUrl: string }>>()
    .notNull()
    .default(sql`'[]'`),
  createdAt: text("created_at").notNull(),
  updatedAt: text("updated_at").notNull(),
});

export const plans = sqliteTable("plans", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  shortName: text("short_name"),
  creatorUserId: text("creator_user_id"),
  isPublic: integer("is_public", { mode: "boolean" }).notNull(),
  isFavorite: integer("is_favorite", { mode: "boolean" }).notNull().default(false),
  createdAt: text("created_at").notNull(),
  updatedAt: text("updated_at").notNull(),
});

export const planItems = sqliteTable(
  "plan_items",
  {
    id: text("id").primaryKey(),
    planId: text("plan_id").notNull(),
    exerciseId: text("exercise_id").notNull(),
    orderInPlan: integer("order_in_plan").notNull(),
  },
  (t) => [uniqueIndex("plan_items_plan_exercise_uq").on(t.planId, t.exerciseId)],
);

export const pendingNotes = sqliteTable(
  "pending_notes",
  {
    id: text("id").primaryKey(),
    exerciseId: text("exercise_id").notNull(),
    note: text("note").notNull(),
    updatedAt: text("updated_at").notNull(),
  },
  (t) => [uniqueIndex("pending_notes_exercise_uq").on(t.exerciseId)],
);

/** One row: the signed-in user (id = user id). */
export const profile = sqliteTable("profile", {
  id: text("id").primaryKey(),
  email: text("email").notNull(),
  firstName: text("first_name").notNull(),
  lastName: text("last_name").notNull(),
  phone: text("phone"),
  isAdmin: integer("is_admin", { mode: "boolean" }).notNull().default(false),
  activeWorkoutId: text("active_workout_id"),
});

// ---- sync tables (PLAN 4.2) ----

export const outbox = sqliteTable(
  "outbox",
  {
    seq: integer("seq").primaryKey({ autoIncrement: true }),
    opId: text("op_id").notNull().unique(),
    type: text("type").notNull(),
    /** Full flat wire operation `{ opId, type, at, ...fields }` as JSON. */
    payload: text("payload").notNull(),
    entity: text("entity", { enum: ["workout", "item", "set", "exercise", "plan"] }).notNull(),
    entityId: text("entity_id").notNull(),
    createdAt: text("created_at").notNull(),
    attempts: integer("attempts").notNull().default(0),
    lastError: text("last_error"),
    state: text("state", { enum: ["pending", "rejected"] }).notNull().default("pending"),
  },
  (t) => [index("outbox_entity_idx").on(t.entity, t.entityId)],
);

/** Single row (id = 1). */
export const syncState = sqliteTable("sync_state", {
  id: integer("id").primaryKey(),
  cursor: text("cursor"),
  /** Set when the first full pull finished. */
  initialPullAt: text("initial_pull_at"),
  /** serverTime - deviceTime in ms, from the last server response. */
  clockOffsetMs: integer("clock_offset_ms").notNull().default(0),
  lastSyncAt: text("last_sync_at"),
});

export const syncIssues = sqliteTable("sync_issues", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  opId: text("op_id").notNull(),
  type: text("type").notNull(),
  entity: text("entity").notNull(),
  entityId: text("entity_id").notNull(),
  /** The rejected operation (flat wire JSON) so the user can fix and resend it. */
  payload: text("payload").notNull(),
  code: text("code"),
  error: text("error").notNull(),
  /** Server-side row at the time of rejection (JSON) or null. */
  current: text("current"),
  status: text("status", { enum: ["open", "resolved"] }).notNull().default("open"),
  createdAt: text("created_at").notNull(),
});
