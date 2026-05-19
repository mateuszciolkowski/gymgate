import { describe, it, expect } from "vitest";
import { computeWorkoutElapsed, computeWorkoutLastActivity, STALE_WORKOUT_MS } from "./workoutTimer";

const HOUR = 60 * 60 * 1000;
const MIN = 60 * 1000;

// Fixed anchor so tests aren't date-sensitive
const BASE = new Date("2025-01-01T12:00:00Z").getTime();

const ts = (ms: number) => new Date(ms).toISOString();

function makeWorkout(
  createdAt: number,
  updatedAt: number,
  items: Array<{ updatedAt: number; sets: Array<{ updatedAt: number }> }> = [],
) {
  return {
    createdAt: ts(createdAt),
    updatedAt: ts(updatedAt),
    items: items.map((item) => ({
      updatedAt: ts(item.updatedAt),
      sets: item.sets.map((set) => ({ updatedAt: ts(set.updatedAt) })),
    })),
  };
}

describe("computeWorkoutLastActivity", () => {
  it("returns workout.updatedAt when no items", () => {
    const workout = makeWorkout(BASE, BASE + 30 * MIN);
    expect(computeWorkoutLastActivity(workout)).toBe(BASE + 30 * MIN);
  });

  it("returns the latest item.updatedAt when newer than workout", () => {
    const workout = makeWorkout(BASE, BASE + 10 * MIN, [
      { updatedAt: BASE + 45 * MIN, sets: [] },
    ]);
    expect(computeWorkoutLastActivity(workout)).toBe(BASE + 45 * MIN);
  });

  it("returns the latest set.updatedAt when it is the newest timestamp", () => {
    const workout = makeWorkout(BASE, BASE + 10 * MIN, [
      {
        updatedAt: BASE + 20 * MIN,
        sets: [{ updatedAt: BASE + 55 * MIN }, { updatedAt: BASE + 40 * MIN }],
      },
    ]);
    expect(computeWorkoutLastActivity(workout)).toBe(BASE + 55 * MIN);
  });

  it("picks the maximum across multiple items and their sets", () => {
    const workout = makeWorkout(BASE, BASE + 5 * MIN, [
      { updatedAt: BASE + 30 * MIN, sets: [{ updatedAt: BASE + 20 * MIN }] },
      { updatedAt: BASE + 10 * MIN, sets: [{ updatedAt: BASE + 60 * MIN }] },
    ]);
    expect(computeWorkoutLastActivity(workout)).toBe(BASE + 60 * MIN);
  });
});

describe("computeWorkoutElapsed — normal (non-stale) workout", () => {
  it("returns elapsed = now - createdAt and isStale = false", () => {
    // Workout started 45 min ago, last set added 5 min ago → still active
    const now = BASE + 45 * MIN;
    const workout = makeWorkout(BASE, BASE + 40 * MIN, [
      { updatedAt: BASE + 40 * MIN, sets: [{ updatedAt: BASE + 40 * MIN }] },
    ]);

    const { elapsed, isStale } = computeWorkoutElapsed(workout, now);

    expect(isStale).toBe(false);
    expect(elapsed).toBe(45 * 60); // 45 minutes in seconds
  });

  it("is not stale when last activity was exactly at the stale threshold", () => {
    const now = BASE + 3 * HOUR;
    const lastActivityAt = now - STALE_WORKOUT_MS; // exactly 2h ago
    const workout = makeWorkout(BASE, lastActivityAt);

    const { isStale } = computeWorkoutElapsed(workout, now);
    expect(isStale).toBe(false);
  });
});

describe("computeWorkoutElapsed — stale workout", () => {
  it("caps elapsed at lastActivity - createdAt, not now - createdAt", () => {
    // Workout: started at BASE, last set 1h later, now is 24h after start
    const createdAt = BASE;
    const lastSetAt = BASE + HOUR; // 1h of real training
    const now = BASE + 24 * HOUR; // user opens app next day

    const workout = makeWorkout(createdAt, BASE + 10 * MIN, [
      { updatedAt: lastSetAt, sets: [{ updatedAt: lastSetAt }] },
    ]);

    const { elapsed, isStale } = computeWorkoutElapsed(workout, now);

    expect(isStale).toBe(true);
    expect(elapsed).toBe(60 * 60); // 1h, NOT 24h
  });

  it("elapsed is 0 when lastActivity equals createdAt (empty stale workout)", () => {
    const now = BASE + 24 * HOUR;
    const workout = makeWorkout(BASE, BASE); // updatedAt == createdAt, no items

    const { elapsed, isStale } = computeWorkoutElapsed(workout, now);

    expect(isStale).toBe(true);
    expect(elapsed).toBe(0);
  });

  it("uses the latest set when deeper than workout.updatedAt", () => {
    // Workout metadata stale but a set was updated 1.5h into the session
    const createdAt = BASE;
    const lastSetAt = BASE + 90 * MIN;
    const now = BASE + 24 * HOUR;

    const workout = makeWorkout(createdAt, BASE + 5 * MIN, [
      { updatedAt: BASE + 30 * MIN, sets: [{ updatedAt: lastSetAt }] },
    ]);

    const { elapsed, isStale } = computeWorkoutElapsed(workout, now);

    expect(isStale).toBe(true);
    expect(elapsed).toBe(90 * 60); // 90 min, not 24h
  });

  it("is stale when last activity was just over the threshold", () => {
    const now = BASE + 3 * HOUR;
    const lastActivityAt = now - STALE_WORKOUT_MS - 1; // 1ms past threshold
    const workout = makeWorkout(BASE, lastActivityAt);

    const { isStale } = computeWorkoutElapsed(workout, now);
    expect(isStale).toBe(true);
  });
});

describe("computeWorkoutElapsed — custom staleMs", () => {
  it("respects a custom stale threshold", () => {
    const customStaleMs = 30 * MIN;
    const now = BASE + HOUR;
    const lastActivity = now - 35 * MIN; // 35 min idle > 30 min threshold
    const workout = makeWorkout(BASE, lastActivity);

    const { isStale } = computeWorkoutElapsed(workout, now, customStaleMs);
    expect(isStale).toBe(true);
  });

  it("not stale with same threshold when last activity is recent enough", () => {
    const customStaleMs = 30 * MIN;
    const now = BASE + HOUR;
    const lastActivity = now - 20 * MIN; // 20 min idle < 30 min threshold
    const workout = makeWorkout(BASE, lastActivity);

    const { isStale } = computeWorkoutElapsed(workout, now, customStaleMs);
    expect(isStale).toBe(false);
  });
});
