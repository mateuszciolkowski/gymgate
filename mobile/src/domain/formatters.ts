export function fmtTimer(s: number) {
  return `${String(Math.floor(s / 60)).padStart(2, "0")}:${String(s % 60).padStart(2, "0")}`;
}

export function fmtDuration(seconds: number | null | undefined): string {
  if (!seconds) return "Brak danych";
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  if (h > 0) return `${h}h ${m}min`;
  return `${m} min`;
}

export function fmtDate(date: string) {
  const text = new Date(date).toLocaleDateString("pl-PL", {
    day: "numeric",
    month: "long",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
  // Newer ICU versions (Hermes on iOS) put " o " before the time; the PWA's browsers do not.
  return text.replace(" o ", " ");
}

/** Trainings list card date ("12 lis 2026"). */
export function fmtListDate(date: string): string {
  return new Date(date).toLocaleDateString("pl-PL", { day: "numeric", month: "short", year: "numeric" });
}

/** Trainings list duration pill ("1h 5m", "42 min"); empty when unknown. D-25 keeps both PWA formats. */
export function fmtListDuration(seconds: number | null | undefined): string {
  if (!seconds) return "";
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  return h > 0 ? `${h}h ${m}m` : `${m} min`;
}

/** Polish plural (D-17): 1 -> one, 2-4 (except 12-14) -> few, else many. */
export function plural(n: number, one: string, few: string, many: string): string {
  const mod10 = n % 10;
  const mod100 = n % 100;
  if (n === 1) return one;
  return mod10 >= 2 && mod10 <= 4 && (mod100 < 12 || mod100 > 14) ? few : many;
}

export const setsWord = (n: number): string => plural(n, "seria", "serie", "serii");
export const exercisesWord = (n: number): string => plural(n, "ćwiczenie", "ćwiczenia", "ćwiczeń");
export const loggedSetsWord = (n: number): string => plural(n, "zalogowana seria", "zalogowane serie", "zalogowanych serii");

/** Chart axis date ("14 sie"). */
export function fmtDayMonth(date: string): string {
  return new Date(date).toLocaleDateString("pl-PL", { day: "numeric", month: "short" });
}
