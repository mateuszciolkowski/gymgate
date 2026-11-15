import { render } from "@testing-library/react-native";
import type { ReactElement } from "react";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { ThemeProvider } from "@/theme";

const storage = { getItemSync: () => null, setItemSync: () => undefined };
const metrics = { frame: { x: 0, y: 0, width: 390, height: 800 }, insets: { top: 0, left: 0, right: 0, bottom: 0 } };

/** Renders with the providers every themed component needs. */
export function renderThemed(ui: ReactElement) {
  return render(
    <SafeAreaProvider initialMetrics={metrics}>
      <ThemeProvider storage={storage}>{ui}</ThemeProvider>
    </SafeAreaProvider>,
  );
}
