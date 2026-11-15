import { useEffect } from "react";
import { StyleSheet } from "react-native";
import Animated, { Easing, useAnimatedStyle, useSharedValue, withRepeat, withTiming } from "react-native-reanimated";

/** PWA spinner: ring with a transparent top edge, spinning (`animate-spin`, 1 s linear). */
export function Spinner({ size = 16, color, borderWidth = 2 }: { size?: number; color: string; borderWidth?: number }) {
  const rotation = useSharedValue(0);
  useEffect(() => {
    rotation.set(withRepeat(withTiming(1, { duration: 1000, easing: Easing.linear }), -1));
  }, [rotation]);
  const spin = useAnimatedStyle(() => ({ transform: [{ rotate: `${rotation.get() * 360}deg` }] }));
  return (
    <Animated.View
      accessibilityRole="progressbar"
      style={[styles.ring, { width: size, height: size, borderRadius: size / 2, borderWidth, borderColor: color }, spin]}
    />
  );
}

const styles = StyleSheet.create({ ring: { borderTopColor: "transparent" } });
