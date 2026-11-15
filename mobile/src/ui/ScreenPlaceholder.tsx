import { StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { fonts, pwaBarlow, useTheme } from "@/theme";

/** Temporary screen body for the routing skeleton: themed background + title in Barlow. */
export function ScreenPlaceholder({ title }: { title: string }) {
  const { theme } = useTheme();
  const insets = useSafeAreaInsets();
  return (
    <View style={[styles.root, { backgroundColor: theme.colors.bg, paddingTop: insets.top + 24 }]}>
      <Text style={[styles.title, { color: theme.colors.text }]}>{title}</Text>
      <Text style={[styles.sub, { color: theme.colors.textSub }]}>GymGate</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, paddingHorizontal: 20 },
  title: { fontFamily: pwaBarlow[800], fontSize: 28 },
  sub: { fontFamily: fonts.dmSans[400], fontSize: 14, marginTop: 4 },
});
