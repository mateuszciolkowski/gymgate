import { drawerWidth, shouldClose, shouldOpen } from "./drawerMath";

describe("drawer gesture thresholds (PWA: 35% open, 30% close)", () => {
  it("panel is 82% of the screen, capped at 330", () => {
    expect(drawerWidth(393)).toBeCloseTo(322.26);
    expect(drawerWidth(600)).toBe(330);
  });
  it("opens from 35% of the width", () => {
    expect(shouldOpen(115.4, 330)).toBe(false);
    expect(shouldOpen(115.5, 330)).toBe(true);
  });
  it("closes from 30% of the width", () => {
    expect(shouldClose(98.9, 330)).toBe(false);
    expect(shouldClose(99, 330)).toBe(true);
  });
});
