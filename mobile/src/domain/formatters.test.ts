import { fmtDuration, fmtTimer } from "./formatters";

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
