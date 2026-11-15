import DateTimePicker, { DateTimePickerAndroid } from "@react-native-community/datetimepicker";
import { useState } from "react";
import { Platform, Pressable, StyleSheet, Text, View } from "react-native";
import { fonts, useTheme } from "@/theme";
import { Icon } from "@/ui";

interface PickerFieldProps {
  mode: "date" | "time";
  value: Date;
  /** Text shown in the field (the PWA's native input rendering). */
  label: string;
  maximumDate?: Date;
  testID?: string;
  onChange: (d: Date) => void;
}

/** Field that opens the native date/time picker: inline under the field on iOS, a system dialog on Android. */
export function PickerField({ mode, value, label, maximumDate, testID, onChange }: PickerFieldProps) {
  const { theme } = useTheme();
  const c = theme.colors;
  const [open, setOpen] = useState(false);

  const press = () => {
    if (Platform.OS === "android") {
      DateTimePickerAndroid.open({ value, mode, is24Hour: true, maximumDate, onChange: (_e, d) => d && onChange(d) });
    } else {
      setOpen((v) => !v);
    }
  };

  return (
    <View>
      <Pressable
        accessibilityRole="button"
        testID={testID}
        onPress={press}
        style={[styles.field, { backgroundColor: c.surface2, borderColor: open ? c.a1 : c.borderMed }]}
      >
        <Text style={[styles.text, { color: c.text }]}>{label}</Text>
        <Icon name={mode === "date" ? "calendar" : "clock"} size={15} color={c.textMuted} />
      </Pressable>
      {open && Platform.OS === "ios" ? (
        <DateTimePicker
          value={value}
          mode={mode}
          display={mode === "date" ? "inline" : "spinner"}
          is24Hour
          maximumDate={maximumDate}
          locale="pl-PL"
          themeVariant={theme.isDark ? "dark" : "light"}
          accentColor={c.a1}
          onChange={(_e, d) => d && onChange(d)}
        />
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  field: { minHeight: 46, paddingHorizontal: 14, paddingVertical: 12, borderRadius: 12, borderWidth: 1, flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 8 },
  text: { fontFamily: fonts.dmSans[400], fontSize: 14 },
});
