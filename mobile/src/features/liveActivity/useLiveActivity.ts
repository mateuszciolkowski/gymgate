import { useCallback, useEffect, useMemo, useRef } from "react";
import { Platform } from "react-native";
import { useActiveWorkout } from "@/features/workouts/queries";
import { addSet, getPlan } from "@/db/repositories";
import type { Db } from "@/db/types";
import { nextFromPlan } from "@/domain/planNext";
import { useAction, useDb, useDbQuery } from "@/providers";
import { getClockOffset } from "@/sync/clock";
import { useTheme } from "@/theme";
import { reconcile, repeatLastSet, staleDateOf, workoutToActivity, type ActivityApi, type ActivityProps, type Reconciler } from "./content";

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
  const nextName = useMemo(() => {
    if (!workout || !plan) return null;
    const n = nextFromPlan(plan, workout.items.map((i) => i.exerciseId), workout.skippedPlanExerciseIds ?? []);
    return (n && plan.items.find((i) => i.exerciseId === n.exerciseId)?.exercise.name) || null;
  }, [workout, plan]);
  const next = useMemo(
    () => workoutToActivity(workout, getClockOffset(db), theme.colors.a1, undefined, nextName),
    [workout, db, theme.colors.a1, nextName],
  );
  // "+ set" on the activity: save the last set of the current exercise again.
  const act = useAction();
  const latest = useRef(workout);
  useEffect(() => {
    latest.current = workout;
  }, [workout]);
  useEffect(() => {
    if (Platform.OS !== "ios") return;
    try {
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const { onAddSetPressed } = require("./activity") as typeof import("./activity");
      const sub = onAddSetPressed(() => {
        const r = repeatLastSet(latest.current);
        if (r) act((ctx) => addSet(ctx, r.itemId, { weight: r.weight, repetitions: r.repetitions }));
      });
      return () => sub.remove();
    } catch (e) {
      console.warn("Live Activity:", e);
    }
  }, [act]);
  const state = useRef<Reconciler>({ sent: null });
  const api = useRef<ActivityApi | null>(null);
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
