import * as Haptics from "expo-haptics";

/** Light tap for switches and set saves; success pattern for finishing a workout. Failures (no motor, simulator) are ignored. */
export const tapHaptic = () =>
  void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => undefined);
export const successHaptic = () =>
  void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => undefined);
