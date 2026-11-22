/**
 * Shared parity fixtures (repo `shared/parity/`): the app runs the same cases in
 * `mobile/src/domain/parity.test.ts`, so both clients must keep identical behaviour.
 */
import { describe, expect, it } from "vitest";
import { fuzzyMatch } from "./fuzzyMatch";
import { planChecklist } from "./planChecklist";
import { computePreviousSets } from "./previousSets";
import { computeWorkoutElapsed, computeWorkoutLastActivity } from "./workoutTimer";

// Vite bundles the JSON at test time (the app tsconfig has no Node types).
const fixtures = import.meta.glob("../../../shared/parity/*.json", { eager: true, import: "default" });
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const fixture = (name: string): any => fixtures[`../../../shared/parity/${name}.json`];

describe("shared parity fixtures", () => {
  it("fuzzyMatch", () => {
    for (const c of fixture("fuzzyMatch").cases) expect([c.text, c.query, fuzzyMatch(c.text, c.query)]).toEqual([c.text, c.query, c.expected]);
  });

  it("planChecklist", () => {
    const f = fixture("planChecklist");
    for (const c of f.cases) expect(planChecklist(f.plan, c.added, c.skipped).map((r) => `${r.exerciseId}:${r.state}`)).toEqual(c.expected);
  });

  it("workoutTimer", () => {
    const f = fixture("workoutTimer");
    for (const c of f.cases) {
      const r = computeWorkoutElapsed(c.workout, Date.parse(c.now), f.staleMs);
      expect([c.name, r.elapsed, r.isStale, computeWorkoutLastActivity(c.workout)]).toEqual([
        c.name, c.expected.elapsed, c.expected.isStale, Date.parse(c.expected.lastActivity),
      ]);
    }
  });

  it("previousSets", () => {
    const f = fixture("previousSets");
    const r = computePreviousSets(f.workouts, f.excludeWorkoutId);
    expect(Object.fromEntries(r.previousSetsByExerciseId)).toEqual(f.expected.previous);
    expect([...r.latestSetsByExerciseId.keys()].sort()).toEqual(f.expected.latestKeys);
  });
});
