import { filterExercises } from "./exerciseFilter";

const ex = (id: string, name: string, creatorUserId: string | null, muscleGroups = ["CHEST"], photos: unknown[] = []) => ({ id, name, creatorUserId, muscleGroups, photos });
const all = [
  ex("1", "Łydki stojąc", null, ["CALVES"]),
  ex("2", "Wyciskanie", "1", ["CHEST", "TRICEPS"], [{}]),
  ex("3", "Moje", "me"),
  ex("4", "Cudze", "other"),
  ex("5", "Arnoldki", "me", ["SHOULDERS"]),
];
const base = { userId: "me", query: "" };
const names = (r: Array<{ name: string }>) => r.map((e) => e.name);

describe("filterExercises", () => {
  it("shows global and own, hides other users' exercises; sorts by Polish alphabet", () => {
    expect(names(filterExercises(all, base))).toEqual(["Arnoldki", "Łydki stojąc", "Moje", "Wyciskanie"]);
  });
  it("Z -> A reverses the order", () => {
    expect(names(filterExercises(all, { ...base, desc: true }))[0]).toBe("Wyciskanie");
  });
  it("combines filters (own + group)", () => {
    expect(names(filterExercises(all, { ...base, onlyMine: true, group: "CHEST" }))).toEqual(["Moje"]);
    expect(names(filterExercises(all, { ...base, onlyWithPhoto: true }))).toEqual(["Wyciskanie"]);
    expect(names(filterExercises(all, { ...base, onlyPerformed: true, performedIds: new Set(["5"]) }))).toEqual(["Arnoldki"]);
  });
  it("search is fuzzy, diacritic-insensitive and matches Polish group names", () => {
    expect(names(filterExercises(all, { ...base, query: "lydki" }))).toEqual(["Łydki stojąc"]);
    expect(names(filterExercises(all, { ...base, query: "wyciskaine" }))).toEqual(["Wyciskanie"]);
    expect(names(filterExercises(all, { ...base, query: "barki" }))).toEqual(["Arnoldki"]);
  });
  it("excludes ids already added", () => {
    expect(names(filterExercises(all, { ...base, excludeIds: new Set(["3", "5"]) }))).toEqual(["Łydki stojąc", "Wyciskanie"]);
  });
});
