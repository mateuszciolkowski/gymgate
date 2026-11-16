import { computeWorkoutLastActivity, STALE_WORKOUT_MS } from "@/domain/workoutTimer";
import type { Workout } from "@/domain/types";

/** Everything the Live Activity shows. Plain JSON: it is handed to the system and rendered by the widget extension. */
export interface ActivityProps {
  workoutId: string;
  name: string;
  /** Epoch ms the system timer counts from (device clock: createdAt minus the stored server clock offset). */
  startedAt: number;
  /** Epoch ms of the last activity (device clock); the frozen time of an abandoned workout (P7). */
  lastActivityAt: number;
  exercise: string | null;
  /** Saved sets of the current exercise. */
  sets: number;
  lastSet: string | null;
  /** Next exercise suggested by the workout's plan, if any. */
  next: string | null;
  accent: string;
  /** Already abandoned when sent (app relaunched after 2 h): the system shows no activity that is stale at start, so the layout is told explicitly. */
  abandoned: boolean;
}

/** After this date the system flags the activity stale (also while the app is suspended): "Trening wstrzymany". */
export const staleDateOf = (p: ActivityProps): Date | undefined => (p.abandoned ? undefined : new Date(p.lastActivityAt + STALE_WORKOUT_MS));

/** The exercise the user touched last (item or set), ties go to the later one. */
function currentItem(workout: Workout) {
  let best: { item: Workout["items"][number]; at: number } | null = null;
  for (const item of [...workout.items].sort((a, b) => a.orderInWorkout - b.orderInWorkout)) {
    const at = Math.max(new Date(item.updatedAt).getTime(), ...item.sets.map((s) => new Date(s.updatedAt).getTime()));
    if (!best || at >= best.at) best = { item, at };
  }
  return best?.item ?? null;
}

/** What the "+ set" button on the activity saves: the last set of the current exercise again. Null when there is nothing to repeat. */
export function repeatLastSet(workout: Workout | null): { itemId: string; weight: string | number; repetitions: number } | null {
  if (!workout || workout.status !== "DRAFT") return null;
  const item = currentItem(workout);
  const last = item?.sets.reduce<(typeof item.sets)[number] | null>((m, s) => (!m || s.setNumber >= m.setNumber ? s : m), null);
  return item && last ? { itemId: item.id, weight: last.weight, repetitions: last.repetitions } : null;
}

export function workoutToActivity(
  workout: Workout | null,
  clockOffsetMs: number,
  accent: string,
  now: number = Date.now(),
  next: string | null = null,
): ActivityProps | null {
  if (!workout || workout.status !== "DRAFT") return null;
  const item = currentItem(workout);
  const last = item?.sets.reduce<(typeof item.sets)[number] | null>((m, s) => (!m || s.setNumber >= m.setNumber ? s : m), null) ?? null;
  const lastActivityAt = computeWorkoutLastActivity(workout) - clockOffsetMs;
  return {
    workoutId: workout.id,
    name: workout.workoutName?.trim() || "Trening",
    startedAt: new Date(workout.createdAt).getTime() - clockOffsetMs,
    lastActivityAt,
    abandoned: now - lastActivityAt > STALE_WORKOUT_MS,
    exercise: item?.exercise.name ?? null,
    sets: item?.sets.length ?? 0,
    lastSet: last ? `${Number(last.weight)} kg × ${last.repetitions}` : null,
    next,
    accent,
  };
}

export interface ActivityApi {
  start(props: ActivityProps): void;
  update(props: ActivityProps): void;
  end(): void;
  /** True when a system activity of ours exists (survives an app kill). */
  exists(): boolean;
}

/** Last props sent, by the reconciler. */
export interface Reconciler {
  sent: ActivityProps | null;
}

/** Start / update / end decision (P1, P4, P8). Calls `api` at most once. */
export function reconcile(state: Reconciler, next: ActivityProps | null, api: ActivityApi): void {
  if (!next) {
    if (api.exists()) api.end();
    state.sent = null;
    return;
  }
  if (!api.exists() || (state.sent && state.sent.workoutId !== next.workoutId)) {
    if (api.exists()) api.end();
    api.start(next);
  } else if (!state.sent || JSON.stringify(state.sent) !== JSON.stringify(next)) {
    api.update(next);
  }
  state.sent = next;
}
