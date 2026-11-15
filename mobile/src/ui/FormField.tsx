import type { ReactNode } from "react";
import { StyleSheet, Text, TextInput, View, type StyleProp, type TextInputProps, type ViewStyle } from "react-native";
import { fonts, useTheme } from "@/theme";

export interface FormFieldProps {
  label?: string;
  optional?: boolean;
  hint?: string;
  error?: string | null;
  children: ReactNode;
  style?: StyleProp<ViewStyle>;
}

/** Label (uppercase), control, hint or error. Same metrics as frontend/src/components/ui/FormField.tsx. */
export function FormField({ label, optional = false, hint, error, children, style }: FormFieldProps) {
  const { theme } = useTheme();
  const c = theme.colors;
  return (
    <View style={[styles.root, style]}>
      {label ? (
        <Text style={[styles.label, { color: c.textSub }]}>
          {label}{" "}
          {optional ? <Text style={[styles.optional, { color: c.textMuted }]}>(opcjonalnie)</Text> : null}
        </Text>
      ) : null}
      {children}
      {hint && !error ? <Text style={[styles.hint, { color: c.textMuted }]}>{hint}</Text> : null}
      {error ? <Text style={[styles.error, { color: c.error }]}>{error}</Text> : null}
    </View>
  );
}

export type TextFieldProps = TextInputProps & { invalid?: boolean };

/** Text input of the auth screens (`fieldStyle` in LoginScreen.tsx): 15 px DM Sans, radius 14, 1 px medium border. */
export function TextField({ invalid, style, editable = true, ...props }: TextFieldProps) {
  const { theme } = useTheme();
  const c = theme.colors;
  return (
    <TextInput
      placeholderTextColor={c.textMuted}
      selectionColor={c.a1}
      editable={editable}
      {...props}
      style={[
        styles.input,
        {
          color: c.text,
          backgroundColor: c.surface,
          borderColor: invalid ? c.error : c.borderMed,
          opacity: editable ? 1 : 0.5,
        },
        style,
      ]}
    />
  );
}

const styles = StyleSheet.create({
  root: { marginBottom: 16 },
  label: {
    fontFamily: fonts.dmSans[700],
    fontSize: 12,
    lineHeight: 18,
    letterSpacing: 0.72,
    textTransform: "uppercase",
    marginBottom: 8,
  },
  optional: { fontFamily: fonts.dmSans[400], textTransform: "none", letterSpacing: 0 },
  hint: { fontFamily: fonts.dmSans[400], fontSize: 11, lineHeight: 13.75, marginTop: 6 },
  error: { fontFamily: fonts.dmSans[500], fontSize: 12, lineHeight: 18, marginTop: 6 },
  input: {
    minHeight: 50,
    paddingHorizontal: 15,
    paddingVertical: 13,
    borderRadius: 14,
    borderWidth: 1,
    fontSize: 15,
    fontFamily: fonts.dmSans[400],
  },
});
