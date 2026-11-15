import { Alert } from "react-native";

/** Native replacement for the PWA `alert(message)`. */
export function showAlert(message: string, title?: string): void {
  Alert.alert(title ?? "", message);
}

/** Native replacement for the PWA `confirm(message)`; resolves true on the confirm button. */
export function confirmAlert(message: string, confirmLabel = "OK", cancelLabel = "Anuluj"): Promise<boolean> {
  return new Promise((resolve) => {
    Alert.alert(
      "",
      message,
      [
        { text: cancelLabel, style: "cancel", onPress: () => resolve(false) },
        { text: confirmLabel, onPress: () => resolve(true) },
      ],
      { cancelable: true, onDismiss: () => resolve(false) },
    );
  });
}

/** Three-way choice for logging out with unsent changes. Resolves null on cancel. */
export function chooseLogout(pending: number): Promise<"keep" | "discard" | null> {
  return new Promise((resolve) => {
    Alert.alert(
      "Niewysłane zmiany",
      `Masz niewysłane zmiany (${pending}). Zachowaj dane na urządzeniu, aby wysłać je po ponownym zalogowaniu, albo porzuć je i wyloguj się.`,
      [
        { text: "Anuluj", style: "cancel", onPress: () => resolve(null) },
        { text: "Zachowaj dane", onPress: () => resolve("keep") },
        { text: "Porzuć zmiany", style: "destructive", onPress: () => resolve("discard") },
      ],
      { cancelable: true, onDismiss: () => resolve(null) },
    );
  });
}
