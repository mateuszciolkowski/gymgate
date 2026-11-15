import type { BoxShadowValue } from "react-native";
import type { BoxShadow } from "./types";

/** Theme shadows (CSS naming: spreadRadius) as the React Native `boxShadow` style (spreadDistance). */
export function toBoxShadow(shadows: readonly BoxShadow[]): BoxShadowValue[] {
  return shadows.map(({ offsetX, offsetY, blurRadius, spreadRadius, color }) => ({
    offsetX,
    offsetY,
    blurRadius,
    spreadDistance: spreadRadius,
    color,
  }));
}
