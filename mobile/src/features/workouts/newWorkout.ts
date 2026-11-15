/** Plan picked -> short name fills an empty name, or replaces the previous plan's short name (WorkoutFormModal). */
export function nextWorkoutName(current: string, plan: { shortName?: string | null } | undefined, previous: { shortName?: string | null } | undefined): string {
  if (!plan?.shortName) return current;
  return !current.trim() || (previous?.shortName && current === previous.shortName) ? plan.shortName : current;
}

/** Date at the start of the chosen day, with the current hour and minute (the PWA form does the same). */
export function workoutDateIso(day: Date, now: Date = new Date()): string {
  return new Date(day.getFullYear(), day.getMonth(), day.getDate(), now.getHours(), now.getMinutes()).toISOString();
}
