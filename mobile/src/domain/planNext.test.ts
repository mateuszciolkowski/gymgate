import { nextFromPlan, remainingFromPlan } from "./planNext";

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
