import { abandonedDurationSeconds, fmtAgo } from "./workoutTimer";
import { durationBetween, fmtTotal, hhmm, initialTimes, movedWorkoutDate } from "./workoutEdit";

describe("workout edit times", () => {
  it("wraps over midnight", () => {
    expect(durationBetween("10:00", "11:30")).toBe(5400);
    expect(durationBetween("23:00", "01:00")).toBe(7200);
    expect(durationBetween("12:00", "12:00")).toBe(0);
  });
  it("initial times default to 12:00 / 13:00", () => {
    expect(initialTimes(undefined, null)).toEqual({ start: "12:00", end: "13:00" });
    const created = new Date(2026, 10, 1, 9, 5);
    expect(initialTimes(created.toISOString(), 3900)).toEqual({ start: hhmm(created), end: "10:10" });
    expect(initialTimes(created.toISOString(), null).end).toBe("13:00");
  });
  it("formats the total", () => {
    expect(fmtTotal(0)).toBe("0 min");
    expect(fmtTotal(2700)).toBe("45 min");
    expect(fmtTotal(3900)).toBe("1h 5m");
  });
  it("moves the date only when the day changes", () => {
    const iso = new Date(2026, 10, 1, 9, 30).toISOString();
    expect(movedWorkoutDate(iso, new Date(2026, 10, 1))).toBe(iso);
    expect(movedWorkoutDate(iso, new Date(2026, 9, 20))).toBe(new Date(2026, 9, 20, 9, 30).toISOString());
  });
});

describe("abandoned workout", () => {
  it("labels the idle time", () => {
    expect(fmtAgo(45 * 60_000)).toBe("45 min");
    expect(fmtAgo(125 * 60_000)).toBe("2h 5min");
  });
  it("duration is last activity minus start", () => {
    const w = {
      createdAt: "2026-01-01T10:00:00.000Z",
      updatedAt: "2026-01-01T10:05:00.000Z",
      items: [{ updatedAt: "2026-01-01T10:30:00.000Z", sets: [{ updatedAt: "2026-01-01T11:00:00.000Z" }] }],
    };
    expect(abandonedDurationSeconds(w)).toBe(3600);
  });
});
