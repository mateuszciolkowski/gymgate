// Wire contract of backend/src/modules/{sync,auth}/API.md (mobile must not import backend code).
import type { exercises, workoutItems, workoutSets, workouts } from "../db/schema";
import type { Profile } from "../db/repositories/profile";

/** The calls the sync engine needs. The session provides one that refreshes the access token on 401. */
export interface Transport {
  get<T>(path: string): Promise<T>;
  post<T>(path: string, body?: unknown): Promise<T>;
}

export type OpStatus = "applied" | "duplicate" | "superseded" | "rejected";

export interface PushResult {
  opId: string;
  status: OpStatus;
  code?: string;
  error?: string;
  /** Server-side record (nested Prisma shape: workout with items and sets, plan with items) or null. */
  current?: unknown;
}

export interface PushResponse {
  success: true;
  data: { serverTime: string; results: PushResult[] };
}

export type WireWorkout = typeof workouts.$inferSelect;
export type WireItem = typeof workoutItems.$inferSelect;
export type WireSet = typeof workoutSets.$inferSelect;
export type WireExercise = typeof exercises.$inferSelect;
export interface WirePlan {
  id: string;
  name: string;
  shortName: string | null;
  creatorUserId: string | null;
  isPublic: boolean;
  isFavorite?: boolean;
  createdAt: string;
  updatedAt: string;
  items: Array<{ id: string; exerciseId: string; orderInPlan: number }>;
}
export interface WirePendingNote {
  exerciseId: string;
  note: string;
  updatedAt: string;
}
export type WireProfile = Omit<Profile, "activeWorkoutId"> & { activeWorkoutId: string | null };

export type DeleteEntity = "workout" | "workoutItem" | "workoutSet" | "exercise" | "plan" | "pendingNote";

export interface PullData {
  cursor: string | null;
  hasMore: boolean;
  resyncRequired: boolean;
  snapshotToken?: string | null;
  upserts: {
    workouts: WireWorkout[];
    workoutItems: WireItem[];
    workoutSets: WireSet[];
    exercises: WireExercise[];
    plans: WirePlan[];
    pendingNotes: WirePendingNote[];
    profile: WireProfile | null;
  };
  deletes: Array<{ entity: DeleteEntity; id: string }>;
  serverTime: string;
}

export interface SessionUser extends WireProfile {
  updatedAt?: string;
}

export interface AuthData {
  user: SessionUser;
  accessToken: string;
  accessTokenExpiresIn: number;
  refreshToken: string;
  refreshTokenExpiresAt: string;
}
