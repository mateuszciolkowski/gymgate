import { Text, Pressable } from "react-native";
import { fireEvent, render, screen } from "@testing-library/react-native";
import {
  DEFAULT_THEME,
  THEME_STORAGE_KEY,
  ThemeProvider,
  useTheme,
  type ThemeStorage,
} from "./ThemeProvider";
import { themes } from "./themes.generated";

function fakeStorage(
  initial: Record<string, string> = {},
): ThemeStorage & { data: Record<string, string> } {
  const data = { ...initial };
  return {
    data,
    getItemSync: (k) => data[k] ?? null,
    setItemSync: (k, v) => {
      data[k] = v;
    },
  };
}

function Probe() {
  const { themeName, theme, setTheme } = useTheme();
  return (
    <>
      <Text testID="name">{themeName}</Text>
      <Text testID="bg">{theme.colors.bg}</Text>
      <Pressable testID="pick" onPress={() => setTheme("light")}>
        <Text>pick</Text>
      </Pressable>
    </>
  );
}

describe("ThemeProvider", () => {
  it("defaults to the PWA default theme (dark)", async () => {
    await render(
      <ThemeProvider storage={fakeStorage()}>
        <Probe />
      </ThemeProvider>,
    );
    expect(DEFAULT_THEME).toBe("dark");
    expect(screen.getByTestId("name").props.children).toBe("dark");
    expect(screen.getByTestId("bg").props.children).toBe(themes.dark.colors.bg);
  });

  it("restores a stored theme", async () => {
    await render(
      <ThemeProvider storage={fakeStorage({ [THEME_STORAGE_KEY]: "sage" })}>
        <Probe />
      </ThemeProvider>,
    );
    expect(screen.getByTestId("name").props.children).toBe("sage");
  });

  it("ignores an invalid stored theme", async () => {
    await render(
      <ThemeProvider storage={fakeStorage({ [THEME_STORAGE_KEY]: "nope" })}>
        <Probe />
      </ThemeProvider>,
    );
    expect(screen.getByTestId("name").props.children).toBe("dark");
  });

  it("persists the choice", async () => {
    const storage = fakeStorage();
    await render(
      <ThemeProvider storage={storage}>
        <Probe />
      </ThemeProvider>,
    );
    await fireEvent.press(screen.getByTestId("pick"));
    expect(screen.getByTestId("name").props.children).toBe("light");
    expect(storage.data[THEME_STORAGE_KEY]).toBe("light");
  });

  it("survives a throwing storage", async () => {
    const broken: ThemeStorage = {
      getItemSync: () => {
        throw new Error("x");
      },
      setItemSync: () => {
        throw new Error("x");
      },
    };
    await render(
      <ThemeProvider storage={broken}>
        <Probe />
      </ThemeProvider>,
    );
    await fireEvent.press(screen.getByTestId("pick"));
    expect(screen.getByTestId("name").props.children).toBe("light");
  });
});
