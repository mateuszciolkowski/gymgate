import { MUSCLE_GROUPS } from "./muscleGroups";

describe("MUSCLE_GROUPS", () => {
  it("has 20 unique values with Polish labels", () => {
    expect(MUSCLE_GROUPS).toHaveLength(20);
    expect(new Set(MUSCLE_GROUPS.map((g) => g.value)).size).toBe(20);
    expect(MUSCLE_GROUPS.find((g) => g.value === "CHEST")?.label).toBe("Klatka piersiowa");
  });
  it("does not contain LEGS (not in the database enum)", () => {
    expect(MUSCLE_GROUPS.some((g) => (g.value as string) === "LEGS")).toBe(false);
  });
});
