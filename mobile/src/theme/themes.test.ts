import { execFileSync } from "node:child_process";
import { join } from "node:path";
import { THEME_NAMES, themes } from "./themes.generated";

const root = join(__dirname, "../..");

describe("generated themes", () => {
  it("is up to date with docs/tokeny-motywow.json", () => {
    expect(() =>
      execFileSync(process.execPath, [join(root, "tools/gen-themes.mjs"), "--check"], {
        stdio: "pipe",
      }),
    ).not.toThrow();
  });

  it("contains all 12 PWA themes", () => {
    expect([...THEME_NAMES].sort()).toEqual([
      "blossom",
      "crimson",
      "dark",
      "ember",
      "graphite",
      "light",
      "sage",
      "sand",
      "sky",
      "slate",
      "steel",
      "violet",
    ]);
    expect(Object.keys(themes).sort()).toEqual([...THEME_NAMES].sort());
  });

  it("gives every theme an identical key set", () => {
    const keysOf = (o: object) => Object.keys(o).sort().join(",");
    const ref = themes.dark;
    for (const name of THEME_NAMES) {
      const t = themes[name];
      expect(keysOf(t)).toBe(keysOf(ref));
      expect(keysOf(t.colors)).toBe(keysOf(ref.colors));
      expect(t.name).toBe(name);
      expect(t.shadow.length).toBeGreaterThan(0);
      expect(t.shadowElevated.length).toBeGreaterThan(0);
    }
  });

  it("marks the six dark and six light themes", () => {
    const dark = THEME_NAMES.filter((n) => themes[n].isDark);
    expect(dark).toEqual(["dark", "steel", "graphite", "violet", "ember", "crimson"]);
  });

  it("resolves derived CSS values to explicit RN values", () => {
    expect(themes.dark.colors.glow).toBe("rgba(16, 185, 129, 0.35)");
    expect(themes.dark.colors.btnHover).toBe("#059669");
    expect(themes.dark.gradBtn).toEqual({
      colors: ["#10B981", "#059669"],
      start: { x: 0, y: 0 },
      end: { x: 1, y: 1 },
    });
    expect(themes.dark.shadow).toHaveLength(2);
    expect(themes.dark.shadow[0]).toEqual({
      offsetX: 0,
      offsetY: 1,
      blurRadius: 3,
      spreadRadius: 0,
      color: "rgba(0, 0, 0, 0.4)",
    });
    for (const name of THEME_NAMES) {
      for (const value of Object.values(themes[name].colors)) {
        expect(value).toMatch(/^(#[0-9A-Fa-f]{6}|rgba\()/);
      }
    }
  });
});
