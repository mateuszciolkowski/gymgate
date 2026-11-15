const pad = (n: number) => String(n).padStart(2, "0");

/** Local "HH:MM" of an ISO instant (the PWA's `toTimeString().slice(0, 5)`). */
export const hhmm = (d: Date): string => `${pad(d.getHours())}:${pad(d.getMinutes())}`;

/** Seconds between two "HH:MM" values; negative differences wrap over midnight (WorkoutEditModal). */
export function durationBetween(start: string, end: string): number {
  const secs = (t: string) => {
    const [h, m] = (t || "00:00").split(":").map(Number);
    return (h || 0) * 3600 + (m || 0) * 60;
  };
  const diff = secs(end) - secs(start);
  return diff < 0 ? diff + 24 * 3600 : diff;
}

/** Start = time of `createdAt`; end = start + duration. Without data: "12:00" and "13:00". */
export function initialTimes(createdAt: string | undefined, durationSeconds: number | null | undefined): { start: string; end: string } {
  if (!createdAt) return { start: "12:00", end: "13:00" };
  const created = new Date(createdAt);
  const end = durationSeconds ? hhmm(new Date(created.getTime() + durationSeconds * 1000)) : "13:00";
  return { start: hhmm(created), end };
}

/** "Czas całkowity" value: "{h}h {m}m", "{m} min", "0 min". */
export function fmtTotal(seconds: number): string {
  if (!seconds) return "0 min";
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  return h > 0 ? `${h}h ${m}m` : `${m} min`;
}

const sameDay = (a: Date, b: Date) => a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();

/** Keeps the stored instant when the day did not change; a new day keeps the original time of day. */
export function movedWorkoutDate(originalIso: string, day: Date): string {
  const original = new Date(originalIso);
  if (sameDay(original, day)) return originalIso;
  return new Date(day.getFullYear(), day.getMonth(), day.getDate(), original.getHours(), original.getMinutes()).toISOString();
}
