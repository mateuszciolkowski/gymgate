import { useCallback, useEffect, useMemo, useRef } from "react";
import { Platform } from "react-native";
import { useActiveWorkout } from "@/features/workouts/queries";
import { addItem, addSet, getActiveWorkout, getAllStats, getPlan, listWorkouts } from "@/db/repositories";
import type { Workout } from "@/domain/types";
import { computePreviousSets } from "@/domain/previousSets";
import type { Db } from "@/db/types";
import { nextFromPlan, remainingFromPlan } from "@/domain/planNext";
import { useAction, useDb, useDbQuery } from "@/providers";
import { getClockOffset } from "@/sync/clock";
import { useTheme } from "@/theme";
import { proposedSet, reconcile, staleDateOf, workoutToActivity, type ActivityApi, type ActivityProps, type Reconciler } from "./content";

/** iOS only; lazy so Android never touches `createLiveActivity` (it throws there in SDK 58, expo#52675). */
function iosApi(): ActivityApi {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { workoutActivity } = require("./activity") as typeof import("./activity");
  const current = () => workoutActivity.getInstances()[0];
  return {
    exists: () => workoutActivity.getInstances().length > 0,
    start: (p) => void workoutActivity.start(p, "gymgate://", staleDateOf(p)),
    update: (p: ActivityProps) => current()?.update(p, staleDateOf(p)),
    end: () => void Promise.all(workoutActivity.getInstances().map((i) => i.end("immediate"))),
  };
}

type Plan = ReturnType<typeof getPlan>;
type Previous = ReturnType<typeof computePreviousSets> | null;

function buildGuide(workout: Workout, plan: Plan, previous: Previous, stats: Map<string, { lastWeight: string; lastReps: number }>) {
  const added = workout.items.map((i) => i.exerciseId);
  const skipped = workout.skippedPlanExerciseIds ?? [];
  const n = nextFromPlan(plan, added, skipped);
  const total = plan?.items.length ?? 0;
  return {
    proposal: proposedSet(
      workout,
      (id) => previous?.previousSetsByExerciseId.get(id),
      (id) => stats.get(id),
    ),
    nextExerciseId: n?.exerciseId ?? null,
    nextName: (n && plan?.items.find((i) => i.exerciseId === n.exerciseId)?.exercise.name) || null,
    plan: plan ? { done: total - remainingFromPlan(plan, added, skipped), total } : null,
  };
}

/** Same content as the render path, read straight from the database (used right after a button write). */
function readActivity(db: Db, accent: string): ActivityProps | null {
  const w = getActiveWorkout(db);
  if (!w) return null;
  const plan = w.workoutPlanId ? getPlan(db, w.workoutPlanId) : null;
  const stats = new Map(getAllStats(db).map((s) => [s.exerciseId, s]));
  return workoutToActivity(w, getClockOffset(db), accent, undefined, buildGuide(w, plan, computePreviousSets(listWorkouts(db), w.id), stats));
}

/**
 * Mirrors the active DRAFT workout into a Live Activity. Driven by the live database query, so completing,
 * deleting or pulling a completed workout from another device ends it (P1, P8). Mount once (app shell).
 * Android notification: not implemented (docs/PLAN 12.4 design note in the stage report).
 */
export function useLiveActivity(): void {
  const { db } = useDb();
  const { theme } = useTheme();
  const workout = useActiveWorkout();
  const planId = workout?.workoutPlanId ?? null;
  const plan = useDbQuery(useCallback((d: Db) => (planId ? getPlan(d, planId) : null), [planId]));
  const stats = useDbQuery(useCallback((d: Db) => new Map(getAllStats(d).map((s) => [s.exerciseId, s])), []));
  // Previous sessions only change with this workout's exercises (same rule as the workout screen).
  const exerciseKey = workout?.items.map((i) => i.exerciseId).join(",") ?? "";
  const workoutId = workout?.id ?? null;
  const previous = useMemo(
    () => (workoutId ? computePreviousSets(listWorkouts(db), workoutId) : null),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [db, workoutId, exerciseKey],
  );
  const guide = useMemo(() => (workout ? buildGuide(workout, plan, previous, stats) : null), [workout, plan, previous, stats]);
  const next = useMemo(
    () => workoutToActivity(workout, getClockOffset(db), theme.colors.a1, undefined, guide ?? {}),
    [workout, db, theme.colors.a1, guide],
  );
  const state = useRef<Reconciler>({ sent: null });
  const api = useRef<ActivityApi | null>(null);
  // Buttons on the activity: save the proposed set / add the next plan exercise (app runs them in the background).
  const act = useAction();
  const latest = useRef({ workout, guide, accent: theme.colors.a1 });
  useEffect(() => {
    latest.current = { workout, guide, accent: theme.colors.a1 };
  }, [workout, guide, theme.colors.a1]);
  useEffect(() => {
    if (Platform.OS !== "ios") return;
    try {
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const { onActivityButton } = require("./activity") as typeof import("./activity");
      const sub = onActivityButton((target) => {
        const { workout: w, guide: g } = latest.current;
        if (!w || !g) return;
        if (target === "add-set" && g.proposal) {
          const { itemId, weight, repetitions } = g.proposal;
          act((ctx) => addSet(ctx, itemId, { weight, repetitions }));
        } else if (target === "next-exercise" && g.nextExerciseId) {
          const exerciseId = g.nextExerciseId;
          act((ctx) => addItem(ctx, w.id, exerciseId));
        } else return;
        // The app may be in the background (no React render until it is opened): push the new content now.
        api.current ??= iosApi();
        reconcile(state.current, readActivity(db, latest.current.accent), api.current);
      });
      return () => sub.remove();
    } catch (e) {
      console.warn("Live Activity:", e);
    }
  }, [act, db]);
  useEffect(() => {
    if (Platform.OS !== "ios") return;
    try {
      api.current ??= iosApi();
      reconcile(state.current, next, api.current);
    } catch (e) {
      console.warn("Live Activity:", e); // never break the app over a decoration
    }
  }, [next]);
  // Leaving the signed-in shell (logout) removes the activity.
  useEffect(
    () => () => {
      try {
        if (Platform.OS === "ios") reconcile(state.current, null, (api.current ??= iosApi()));
      } catch {}
    },
    [],
  );
}
