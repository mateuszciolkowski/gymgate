import { fuzzyMatch } from "./fuzzyMatch";

describe("fuzzyMatch", () => {
  it("matches everything for an empty query", () => {
    expect(fuzzyMatch("Przysiad", "")).toBe(true);
    expect(fuzzyMatch("Przysiad", "   ")).toBe(true);
  });
  it("normalizes Polish diacritics both ways", () => {
    expect(fuzzyMatch("Łydki stojąc", "lydki")).toBe(true);
    expect(fuzzyMatch("Lydki", "łydki")).toBe(true);
  });
  it("ignores token order", () => {
    expect(fuzzyMatch("Wyciskanie francuskie hantlem", "wyciskanie hantlem")).toBe(true);
    expect(fuzzyMatch("Wyciskanie francuskie hantlem", "hantlem wyciskanie")).toBe(true);
  });
  it("tolerates small typos", () => {
    expect(fuzzyMatch("Przysiad ze sztangą", "przysiat")).toBe(true);
  });
  it("matches substrings", () => {
    expect(fuzzyMatch("Martwy ciąg", "mart")).toBe(true);
  });
  it("requires every token to match", () => {
    expect(fuzzyMatch("Przysiad", "przysiad wyciskanie")).toBe(false);
  });
  it("does not match unrelated words", () => {
    expect(fuzzyMatch("Przysiad", "xyzxyz")).toBe(false);
  });
});
