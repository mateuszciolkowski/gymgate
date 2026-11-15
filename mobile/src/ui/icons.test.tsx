import { render } from "@testing-library/react-native";
import { ICON_NAMES, Icon } from "./icons";

describe("Icon", () => {
  it("exposes the PWA icon set", () => {
    for (const n of [
      "archive",
      "chart",
      "dumbbell",
      "edit",
      "menu",
      "photo",
      "plus",
      "trash",
      "settings",
    ]) {
      expect(ICON_NAMES).toContain(n);
    }
  });
  it("renders every icon without throwing", async () => {
    for (const name of ICON_NAMES) {
      await expect(render(<Icon name={name} color="#fff" />)).resolves.toBeDefined();
    }
  });
});
