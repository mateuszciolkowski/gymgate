import { nextWorkoutName, workoutDateIso } from "./newWorkout";

describe("nextWorkoutName", () => {
  it("fills an empty name with the plan's short name", () => {
    expect(nextWorkoutName("", { shortName: "Push" }, undefined)).toBe("Push");
  });
  it("replaces the previous plan's short name but keeps a typed name", () => {
    expect(nextWorkoutName("Push", { shortName: "Pull" }, { shortName: "Push" })).toBe("Pull");
    expect(nextWorkoutName("Moj trening", { shortName: "Pull" }, { shortName: "Push" })).toBe("Moj trening");
  });
  it("keeps the name when the plan has no short name", () => {
    expect(nextWorkoutName("x", { shortName: null }, undefined)).toBe("x");
  });
});

describe("workoutDateIso", () => {
  it("combines the chosen day with the current hour and minute", () => {
    const iso = workoutDateIso(new Date(2026, 0, 5), new Date(2026, 10, 15, 16, 21));
    expect(new Date(iso).getTime()).toBe(new Date(2026, 0, 5, 16, 21).getTime());
  });
});
