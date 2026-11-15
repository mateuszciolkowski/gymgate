import { diffVersions } from "./planHistory";
import type { WorkoutPlanVersion } from "./types";

const v = (ids: string[], over: Partial<WorkoutPlanVersion> = {}): WorkoutPlanVersion => ({
  version: 1,
  name: "Push",
  shortName: null,
  isPublic: false,
  exercises: ids.map((id) => ({ exerciseId: id, name: id.toUpperCase() })),
  createdAt: "2026-01-01T00:00:00.000Z",
  ...over,
});

describe("diffVersions", () => {
  it("reports nothing for identical versions", () => {
    expect(diffVersions(v(["a", "b"]), v(["a", "b"]))).toEqual([]);
  });

  it("reports added and removed without flagging shifted rows as moved", () => {
    expect(diffVersions(v(["a", "b", "c"]), v(["x", "a", "c"]))).toEqual([
      { type: "added", name: "X" },
      { type: "removed", name: "B" },
    ]);
  });

  it("dragging one exercise to the top flags only that exercise", () => {
    expect(diffVersions(v(["a", "b", "c", "d"]), v(["d", "a", "b", "c"]))).toEqual([
      { type: "moved", name: "D", from: 4, to: 1 },
    ]);
  });

  it("reports name, short name and visibility changes", () => {
    expect(
      diffVersions(v(["a"]), v(["a"], { name: "Push B", shortName: "PB", isPublic: true })),
    ).toEqual([
      { type: "name", from: "Push", to: "Push B" },
      { type: "shortName", from: null, to: "PB" },
      { type: "public", to: true },
    ]);
  });
});
