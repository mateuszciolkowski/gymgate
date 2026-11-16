import { useSyncExternalStore } from "react";
import { EMPTY_PLAN_DRAFT, appendExercise, type PlanDraft } from "@/domain/planDraft";
import type { Exercise } from "@/domain/types";

/**
 * The unsaved plan form (PWA: `planDraft` state in AuthenticatedApp). Lives outside the screen so it survives the trip to
 * the exercise picker and "Nowe ćwiczenie". `key` is the edited plan id or "new"; a draft of another plan is never reused.
 */
let current: { key: string; draft: PlanDraft } | null = null;
const listeners = new Set<() => void>();
const emit = () => listeners.forEach((l) => l());

export const getDraft = (key: string): PlanDraft | null => (current?.key === key ? current.draft : null);
export const clearDraft = (): void => {
  current = null;
  emit();
};
export function setDraft(key: string, draft: PlanDraft): void {
  current = { key, draft };
  emit();
}
/** Applies `change` to the draft of `key`, if there is one. */
export function updateDraft(key: string, change: (d: PlanDraft) => PlanDraft): void {
  if (current?.key === key) setDraft(key, change(current.draft));
}

/** The draft of `key` (call `ensureDraft` first). */
export function usePlanDraft(key: string): PlanDraft {
  const subscribe = (l: () => void) => (listeners.add(l), () => void listeners.delete(l));
  return useSyncExternalStore(subscribe, () => getDraft(key)) ?? EMPTY_PLAN_DRAFT;
}

/** Stores `initial()` as the draft of `key` unless the form already has one (e.g. coming back from the picker). */
export function ensureDraft(key: string, initial: () => PlanDraft): void {
  if (!getDraft(key)) setDraft(key, initial());
}

/** Adds an exercise to the form draft (the picker and "Nowe ćwiczenie" return their result this way). */
export function appendToDraft(key: string, exercise: Pick<Exercise, "id" | "name" | "muscleGroups">): void {
  updateDraft(key, (d) => appendExercise(d, exercise));
}
