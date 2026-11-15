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
