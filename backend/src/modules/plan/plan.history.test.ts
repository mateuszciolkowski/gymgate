import { describe, it, expect } from "vitest";
import { sameSnapshot, toSnapshot, versionsToRecord } from "./plan.history.js";

const plan = (exerciseIds: string[], over: Partial<{ name: string; isPublic: boolean }> = {}) => ({
  name: over.name ?? "Push",
  shortName: null,
  isPublic: over.isPublic ?? false,
  updatedAt: new Date("2026-01-01"),
  // reversed on purpose: toSnapshot must sort by orderInPlan
  items: exerciseIds
    .map((id, i) => ({ exerciseId: id, orderInPlan: i, exercise: { name: `name-${id}` } }))
    .reverse(),
});

describe("plan history", () => {
  it("toSnapshot orders exercises by orderInPlan and copies names", () => {
    expect(toSnapshot(plan(["a", "b"])).exercises).toEqual([
      { exerciseId: "a", name: "name-a" },
      { exerciseId: "b", name: "name-b" },
    ]);
  });

  it("sameSnapshot ignores exercise renames but not reorders", () => {
    const s = toSnapshot(plan(["a", "b"]));
    expect(sameSnapshot(s, { ...s, exercises: s.exercises.map((e) => ({ ...e, name: "x" })) })).toBe(true);
    expect(sameSnapshot(s, toSnapshot(plan(["b", "a"])))).toBe(false);
  });

  it("first edit of a plan without history records pre-edit v1 and new v2", () => {
    const rows = versionsToRecord(plan(["a"]), plan(["a", "b"]), null);
    expect(rows.map((r) => r.version)).toEqual([1, 2]);
    expect(rows[0]!.createdAt).toEqual(new Date("2026-01-01"));
    expect(rows[1]!.exercises.map((e) => e.exerciseId)).toEqual(["a", "b"]);
  });

  it("no-op save records nothing when history exists", () => {
    const latest = { version: 3, ...toSnapshot(plan(["a"])) };
    expect(versionsToRecord(plan(["a"]), plan(["a"]), latest)).toEqual([]);
  });

  it("real change appends latest+1", () => {
    const latest = { version: 3, ...toSnapshot(plan(["a"])) };
    const rows = versionsToRecord(plan(["a"]), plan(["a"], { name: "Push B" }), latest);
    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({ version: 4, name: "Push B" });
  });
});
