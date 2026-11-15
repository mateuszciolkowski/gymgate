import { useEffect } from "react";
import Animated, { Easing, useAnimatedStyle, useReducedMotion, useSharedValue, withRepeat, withSequence, withTiming } from "react-native-reanimated";

/** 8 px dot with the Tailwind `animate-pulse` rhythm (2 s, opacity 1 -> 0.5 -> 1); static with "reduce motion". */
export function PulseDot({ color, size = 8 }: { color: string; size?: number }) {
  const opacity = useSharedValue(1);
  const reduced = useReducedMotion();
  useEffect(() => {
    if (reduced) return;
    const step = { duration: 1000, easing: Easing.bezier(0.4, 0, 0.6, 1) };
    opacity.set(withRepeat(withSequence(withTiming(0.5, step), withTiming(1, step)), -1));
  }, [opacity, reduced]);
  const style = useAnimatedStyle(() => ({ opacity: opacity.get() }));
  return <Animated.View style={[{ width: size, height: size, borderRadius: size / 2, backgroundColor: color }, style]} />;
}
