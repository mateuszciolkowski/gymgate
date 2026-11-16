import type { WorkoutPlan } from "./types";
import { canEditPlan, exerciseCountLabel, planMuscles, planTabs, visiblePlans } from "./planList";

const plan = (id: string, name: string, over: Partial<WorkoutPlan> = {}, groups: string[][] = []): WorkoutPlan => ({
  id,
  name,
  creatorUserId: "me",
  isPublic: false,
  isFavorite: false,
  createdAt: `2026-01-0${id}T00:00:00.000Z`,
  updatedAt: "",
  items: groups.map((muscleGroups, i) => ({ id: `i${i}`, planId: id, exerciseId: `e${i}`, orderInPlan: i, exercise: { id: `e${i}`, name: `E${i}`, muscleGroups } })),
  ...over,
});

describe("planTabs", () => {
  it("splits like the PWA", () => {
    const all = [
      plan("1", "Mój", { isFavorite: true }),
      plan("2", "Wbudowany", { creatorUserId: null }),
      plan("3", "Cudzy publiczny", { creatorUserId: "x", isPublic: true }),
      plan("4", "Cudzy prywatny", { creatorUserId: "x" }),
    ];
    const t = planTabs(all, "me");
    expect(t.favorites.map((p) => p.id)).toEqual(["1"]);
    expect(t.mine.map((p) => p.id)).toEqual(["1"]);
    expect(t.builtin.map((p) => p.id)).toEqual(["2"]);
    expect(t.community.map((p) => p.id)).toEqual(["3"]);
  });
});

describe("visiblePlans", () => {
  const list = [plan("2", "Żyrafa"), plan("1", "Ąbc"), plan("3", "Brzuch push")];
  it("sorts four ways", () => {
    expect(visiblePlans(list, "", "az").map((p) => p.id)).toEqual(["1", "3", "2"]);
    expect(visiblePlans(list, "", "za").map((p) => p.id)).toEqual(["2", "3", "1"]);
    expect(visiblePlans(list, "", "newest").map((p) => p.id)).toEqual(["3", "2", "1"]);
    expect(visiblePlans(list, "", "oldest").map((p) => p.id)).toEqual(["1", "2", "3"]);
  });
  it("searches fuzzily, ignoring order and Polish letters", () => {
    expect(visiblePlans(list, "push brzuch", "az").map((p) => p.id)).toEqual(["3"]);
    expect(visiblePlans(list, "zyrafa", "az").map((p) => p.id)).toEqual(["2"]);
  });
});

it("planMuscles: distinct, at most three", () => {
  expect(planMuscles(plan("1", "x", {}, [["CHEST", "BACK"], ["CHEST", "ABS"], ["NECK"]]))).toEqual(["CHEST", "BACK", "ABS"]);
});

it("exerciseCountLabel", () => {
  expect([1, 2, 4, 5, 12].map(exerciseCountLabel)).toEqual(["1 ćwiczenie", "2 ćwiczenia", "4 ćwiczenia", "5 ćwiczeń", "12 ćwiczeń"]);
});

it("canEditPlan: author, or admin for built-in", () => {
  expect(canEditPlan(plan("1", "a"), "me", false)).toBe(true);
  expect(canEditPlan(plan("1", "a", { creatorUserId: null }), "me", false)).toBe(false);
  expect(canEditPlan(plan("1", "a", { creatorUserId: null }), "me", true)).toBe(true);
  expect(canEditPlan(plan("1", "a", { creatorUserId: "x" }), "me", true)).toBe(false);
});
