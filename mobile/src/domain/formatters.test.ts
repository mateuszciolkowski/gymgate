import { exercisesWord, fmtDate, fmtDuration, fmtListDuration, fmtTimer, setsWord } from "./formatters";

describe("fmtTimer", () => {
  it("pads minutes and seconds", () => {
    expect(fmtTimer(0)).toBe("00:00");
    expect(fmtTimer(65)).toBe("01:05");
  });
  it("does not wrap minutes into hours", () => {
    expect(fmtTimer(3725)).toBe("62:05");
  });
});

describe("fmtDuration", () => {
  it("returns 'Brak danych' for missing or zero", () => {
    expect(fmtDuration(null)).toBe("Brak danych");
    expect(fmtDuration(undefined)).toBe("Brak danych");
    expect(fmtDuration(0)).toBe("Brak danych");
  });
  it("formats minutes only under an hour", () => {
    expect(fmtDuration(45 * 60)).toBe("45 min");
  });
  it("formats hours and minutes", () => {
    expect(fmtDuration(3900)).toBe("1h 5min");
  });
});

describe("list formatters and plurals (D-17, D-25)", () => {
  it("formats list durations", () => {
    expect(fmtListDuration(null)).toBe("");
    expect(fmtListDuration(3900)).toBe("1h 5m");
    expect(fmtListDuration(2520)).toBe("42 min");
  });
  it("inflects sets and exercises", () => {
    expect([0, 1, 2, 5, 12, 22].map(setsWord)).toEqual(["serii", "seria", "serie", "serii", "serii", "serie"]);
    expect([1, 2, 5, 22].map(exercisesWord)).toEqual(["ćwiczenie", "ćwiczenia", "ćwiczeń", "ćwiczenia"]);
  });
});

describe("fmtDate", () => {
  it("has no ' o ' between date and time", () => {
    expect(fmtDate(new Date(2026, 10, 12, 0, 3).toISOString())).not.toMatch(/ o /);
  });
});
