import type { ReactNode } from "react";
import { StyleSheet, Text, View } from "react-native";
import { fonts, toBoxShadow, useTheme } from "@/theme";

export function EmptyState({ title, description, icon }: { title: string; description?: string; icon?: ReactNode }) {
  const { theme } = useTheme();
  const c = theme.colors;
  return (
    <View style={styles.root}>
      {icon ? (
        <View style={[styles.icon, { backgroundColor: c.surface2, boxShadow: toBoxShadow(theme.shadow) }]}>{icon}</View>
      ) : null}
      <Text style={[styles.title, { color: c.text }]}>{title}</Text>
      {description ? <Text style={[styles.desc, { color: c.textMuted }]}>{description}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { alignItems: "center", justifyContent: "center", paddingVertical: 40, paddingHorizontal: 16 },
  icon: { width: 64, height: 64, borderRadius: 20, marginBottom: 16, alignItems: "center", justifyContent: "center" },
  title: { fontFamily: fonts.dmSans[700], fontSize: 15, lineHeight: 22.5, marginBottom: 8, textAlign: "center" },
  desc: { fontFamily: fonts.dmSans[400], fontSize: 13, lineHeight: 19.5, textAlign: "center" },
});
