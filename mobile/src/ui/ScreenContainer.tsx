import type { ReactNode } from "react";
import { ScrollView, StyleSheet } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useTheme } from "@/theme";

/** Scrollable screen body: 20 px side margin, bottom space of 112 px for the floating bar, max width 672. */
export function ScreenContainer({ children, paddingTop = 24 }: { children: ReactNode; paddingTop?: number }) {
  const { theme } = useTheme();
  const insets = useSafeAreaInsets();
  return (
    <ScrollView
      style={{ backgroundColor: theme.colors.bg }}
      contentContainerStyle={[styles.content, { paddingTop: insets.top + paddingTop }]}
      showsVerticalScrollIndicator={false}
    >
      {children}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: { paddingHorizontal: 20, paddingBottom: 112, width: "100%", maxWidth: 672, alignSelf: "center" },
});
