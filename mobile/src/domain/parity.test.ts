/**
 * Shared parity fixtures (repo `shared/parity/`): the PWA runs the same cases in
 * `frontend/src/utils/parity.test.ts`, so both clients must keep identical behaviour.
 */
import { readFileSync } from "fs";
import { join } from "path";
import { fuzzyMatch } from "./fuzzyMatch";
import { planChecklist } from "./planNext";
import { computePreviousSets } from "./previousSets";
import { computeWorkoutElapsed, computeWorkoutLastActivity } from "./workoutTimer";

 
const fixture = (name: string): any => JSON.parse(readFileSync(join(__dirname, "../../../shared/parity", `${name}.json`), "utf8"));

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
