import { useEffect, useMemo, useRef } from "react";
import { Platform } from "react-native";
import { useActiveWorkout } from "@/features/workouts/queries";
import { useDb } from "@/providers";
import { getClockOffset } from "@/sync/clock";
import { useTheme } from "@/theme";
import { reconcile, staleDateOf, workoutToActivity, type ActivityApi, type ActivityProps, type Reconciler } from "./content";

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
  const next = useMemo(() => workoutToActivity(workout, getClockOffset(db), theme.colors.a1), [workout, db, theme.colors.a1]);
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
