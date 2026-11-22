import { computeWorkoutLastActivity, STALE_WORKOUT_MS } from "@/domain/workoutTimer";
import type { Workout } from "@/domain/types";
import { draftDefaults } from "@/domain/draftSet";
import { setsWord } from "@/domain/formatters";
import type { PreviousSetData } from "@/domain/previousSets";

/** Everything the Live Activity shows. Plain JSON: it is handed to the system and rendered by the widget extension. */
export interface ActivityProps {
  workoutId: string;
  name: string;
  /** Top line next to the timer: "12 serii · 3 ćw. · Plan 3/6". */
  summary: string;
  /** Epoch ms the system timer counts from (device clock: createdAt minus the stored server clock offset). */
  startedAt: number;
  /** Epoch ms of the last activity (device clock); the frozen time of an abandoned workout (P7). */
  lastActivityAt: number;
  exercise: string | null;
  /** Feedback after a save: "✓ Seria 2: 62.5 kg × 8" (the last logged set of the current exercise). */
  logged: string | null;
  /** Label of the "add the proposed set" button, e.g. "+ 62.5 × 8"; null hides it. */
  proposal: string | null;
  /** Label of the "next plan exercise" button, e.g. "⏭ Rozpiętki"; null hides it. */
  next: string | null;
  accent: string;
  /** Already abandoned when sent (app relaunched after 2 h): the system shows no activity that is stale at start, so the layout is told explicitly. */
  abandoned: boolean;
}

/** After this date the system flags the activity stale (also while the app is suspended): "Trening wstrzymany". */
export const staleDateOf = (p: ActivityProps): Date | undefined => (p.abandoned ? undefined : new Date(p.lastActivityAt + STALE_WORKOUT_MS));

/** The exercise the user touched last (item or set), ties go to the later one. */
export function currentItem(workout: Workout) {
  let best: { item: Workout["items"][number]; at: number } | null = null;
  for (const item of [...workout.items].sort((a, b) => a.orderInWorkout - b.orderInWorkout)) {
    const at = Math.max(new Date(item.updatedAt).getTime(), ...item.sets.map((s) => new Date(s.updatedAt).getTime()));
    if (!best || at >= best.at) best = { item, at };
  }
  return best?.item ?? null;
}

const kg = (w: string | number) => `${Number(w)}`;
/** Keeps button labels on one line on the lock screen. */
const short = (s: string, max = 16) => (s.length > max ? `${s.slice(0, max - 1).trimEnd()}…` : s);

export interface SetProposal {
  itemId: string;
  weight: string;
  repetitions: number;
}

/** The set the app would pre-fill for the current exercise ("+ Dodaj serię" defaults, `draftDefaults`). */
export function proposedSet(
  workout: Workout | null,
  previousSets: (exerciseId: string) => PreviousSetData[] | undefined,
  stats: (exerciseId: string) => { lastWeight: string; lastReps: number } | undefined,
): SetProposal | null {
  if (!workout || workout.status !== "DRAFT") return null;
  const item = currentItem(workout);
  if (!item) return null;
  const sets = [...item.sets].sort((a, b) => a.setNumber - b.setNumber);
  const d = draftDefaults({ sets, previousSets: previousSets(item.exerciseId), stats: stats(item.exerciseId) });
  const repetitions = Number.parseInt(d.reps, 10);
  return repetitions >= 1 ? { itemId: item.id, weight: d.weight, repetitions } : null;
}

export interface Guide {
  proposal?: SetProposal | null;
  /** Name of the next plan exercise. */
  nextName?: string | null;
  plan?: { done: number; total: number } | null;
}

export function workoutToActivity(
  workout: Workout | null,
  clockOffsetMs: number,
  accent: string,
  now: number = Date.now(),
  guide: Guide = {},
): ActivityProps | null {
  if (!workout || workout.status !== "DRAFT") return null;
  const item = currentItem(workout);
  const last = item?.sets.reduce<(typeof item.sets)[number] | null>((m, s) => (!m || s.setNumber >= m.setNumber ? s : m), null) ?? null;
  const lastActivityAt = computeWorkoutLastActivity(workout) - clockOffsetMs;
  const totalSets = workout.items.reduce((n, i) => n + i.sets.length, 0);
  return {
    workoutId: workout.id,
    name: workout.workoutName?.trim() || "Trening",
    summary: [
      `${totalSets} ${setsWord(totalSets)}`,
      `${workout.items.length} ćw.`,
      guide.plan && guide.plan.total > 0 ? `Plan ${guide.plan.done}/${guide.plan.total}` : null,
    ]
      .filter(Boolean)
      .join(" · "),
    startedAt: new Date(workout.createdAt).getTime() - clockOffsetMs,
    lastActivityAt,
    abandoned: now - lastActivityAt > STALE_WORKOUT_MS,
    exercise: item?.exercise.name ?? null,
    logged: last ? `✓ Seria ${last.setNumber}: ${kg(last.weight)} kg × ${last.repetitions}` : null,
    proposal: guide.proposal ? `+ ${kg(guide.proposal.weight)} × ${guide.proposal.repetitions}` : null,
    next: guide.nextName ? `⏭ ${short(guide.nextName)}` : null,
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
