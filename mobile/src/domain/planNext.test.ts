import { nextFromPlan, planChecklist, remainingFromPlan } from "./planNext";

const plan = {
  items: [
    { exerciseId: "c", orderInPlan: 2 },
    { exerciseId: "a", orderInPlan: 0 },
    { exerciseId: "b", orderInPlan: 1 },
  ],
};

describe("nextFromPlan", () => {
  it("picks the first by orderInPlan that is neither added nor skipped", () => {
    expect(nextFromPlan(plan, [], [])?.exerciseId).toBe("a");
    expect(nextFromPlan(plan, ["a"], [])?.exerciseId).toBe("b");
    expect(nextFromPlan(plan, ["a"], ["b"])?.exerciseId).toBe("c");
  });
  it("null when everything is done or there is no plan", () => {
    expect(nextFromPlan(plan, ["a", "b"], ["c"])).toBeNull();
    expect(nextFromPlan(null, [], [])).toBeNull();
    expect(remainingFromPlan(plan, ["a"], ["b"])).toBe(1);
    expect(remainingFromPlan(null, [], [])).toBe(0);
  });
});

describe("planChecklist", () => {
  it("lists plan exercises in order with added / next / skipped / todo", () => {
    const plan = { items: [{ exerciseId: "c", orderInPlan: 3 }, { exerciseId: "a", orderInPlan: 1 }, { exerciseId: "b", orderInPlan: 2 }, { exerciseId: "d", orderInPlan: 4 }] };
    expect(planChecklist(plan, ["a"], ["b"]).map((i) => `${i.exerciseId}:${i.state}`)).toEqual(["a:added", "b:skipped", "c:next", "d:todo"]);
    // adding an out-of-order exercise keeps the suggestion on the first remaining one
    expect(planChecklist(plan, ["a", "d"], []).map((i) => i.state)).toEqual(["added", "next", "todo", "added"]);
    expect(planChecklist(null, [], [])).toEqual([]);
  });
});
