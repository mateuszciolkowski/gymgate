import { StyleSheet, Text, View } from "react-native";
import { fonts, useTheme } from "@/theme";
import { Spinner } from "./Spinner";

/** Centered spinner with a caption (PWA loading states: 36 px ring, 13 px muted text). */
export function LoadingBlock({ text, size = 36 }: { text?: string; size?: number }) {
  const { theme } = useTheme();
  return (
    <View style={styles.root}>
      <Spinner size={size} color={theme.colors.a1} />
      {text ? <Text style={[styles.text, { color: theme.colors.textMuted }]}>{text}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, alignItems: "center", justifyContent: "center", gap: 12 },
  text: { fontFamily: fonts.dmSans[500], fontSize: 13, lineHeight: 19.5 },
});
