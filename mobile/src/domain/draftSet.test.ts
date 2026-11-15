import { draftDefaults } from "./draftSet";

const prev = [
  { setNumber: 1, weight: "60", repetitions: 8 },
  { setNumber: 2, weight: "65", repetitions: 6 },
];

describe("draftDefaults", () => {
  it("copies the last set of the exercise", () => {
    const sets = [
      { setNumber: 1, weight: "50", repetitions: 10 },
      { setNumber: 2, weight: "52.5", repetitions: 9 },
    ];
    expect(draftDefaults({ sets, previousSets: prev })).toEqual({ weight: "52.5", reps: "9" });
  });
  it("uses the previous session's first set when nothing is logged yet", () => {
    expect(draftDefaults({ sets: [], previousSets: prev })).toEqual({ weight: "60", reps: "8" });
  });
  it("falls back to the exercise stats, then to 0 kg x 1", () => {
    expect(draftDefaults({ sets: [], stats: { lastWeight: "70", lastReps: 5 } })).toEqual({ weight: "70", reps: "5" });
    expect(draftDefaults({ sets: [] })).toEqual({ weight: "0", reps: "1" });
  });
});
