import { Pressable, StyleSheet, Text } from "react-native";
import { fonts, useTheme } from "@/theme";

export function FilterChip({ label, isActive, onPress }: { label: string; isActive: boolean; onPress: () => void }) {
  const { theme } = useTheme();
  const c = theme.colors;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected: isActive }}
      onPress={onPress}
      style={[styles.chip, { backgroundColor: isActive ? c.btnBg : c.surface2 }]}
    >
      <Text style={[styles.label, { color: isActive ? "#ffffff" : c.textSub }]}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  chip: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 999 },
  label: { fontFamily: fonts.dmSans[500], fontSize: 14, lineHeight: 21 },
});
