import type { WorkoutPlan } from "./types";
import { fuzzyMatch } from "./fuzzyMatch";

export type PlanListTab = "favorites" | "mine" | "builtin" | "community";
export type PlanSort = "az" | "za" | "newest" | "oldest";

/** PWA PlansScreen tab filters. */
export function planTabs(plans: WorkoutPlan[], userId: string): Record<PlanListTab, WorkoutPlan[]> {
  return {
    favorites: plans.filter((p) => p.isFavorite),
    mine: plans.filter((p) => p.creatorUserId === userId),
    builtin: plans.filter((p) => p.creatorUserId === null),
    community: plans.filter((p) => p.creatorUserId !== null && p.creatorUserId !== userId && p.isPublic),
  };
}

/** Search (fuzzy, by name) then sort, like the PWA. */
export function visiblePlans(list: WorkoutPlan[], search: string, sort: PlanSort): WorkoutPlan[] {
  const time = (p: WorkoutPlan) => new Date(p.createdAt).getTime();
  const cmp = {
    az: (a: WorkoutPlan, b: WorkoutPlan) => a.name.localeCompare(b.name, "pl"),
    za: (a: WorkoutPlan, b: WorkoutPlan) => b.name.localeCompare(a.name, "pl"),
    newest: (a: WorkoutPlan, b: WorkoutPlan) => time(b) - time(a),
    oldest: (a: WorkoutPlan, b: WorkoutPlan) => time(a) - time(b),
  }[sort];
  return list.filter((p) => fuzzyMatch(p.name, search)).sort(cmp);
}

/** Up to three distinct muscle groups of the plan's exercises, in plan order. */
export function planMuscles(plan: WorkoutPlan): string[] {
  return [...new Set(plan.items.flatMap((i) => i.exercise.muscleGroups))].slice(0, 3);
}

/** "1 ćwiczenie", "2 ćwiczenia", "5 ćwiczeń" (PWA wording: no special case for 12-14 or 22+). */
export function exerciseCountLabel(n: number): string {
  return `${n} ${n === 1 ? "ćwiczenie" : n < 5 ? "ćwiczenia" : "ćwiczeń"}`;
}

/** Plan can be edited/deleted by its author, or by an admin when it is built-in. */
export function canEditPlan(plan: WorkoutPlan, userId: string, isAdmin: boolean): boolean {
  return plan.creatorUserId === userId || (isAdmin && plan.creatorUserId === null);
}
