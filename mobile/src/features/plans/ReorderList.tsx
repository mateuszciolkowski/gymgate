import { useLayoutEffect, type ReactNode } from "react";
import { StyleSheet, View } from "react-native";
import { GestureDetector, usePanGesture } from "react-native-gesture-handler";
import Animated, { useAnimatedStyle, useSharedValue, withTiming, type SharedValue } from "react-native-reanimated";
import { scheduleOnRN } from "react-native-worklets";

/** Height of one slot: the row (62) and the gap (8). Rows must be exactly this tall for the drag maths. */
export const ROW_HEIGHT = 70;

export function moveItem<T>(list: T[], from: number, to: number): T[] {
  if (from === to || from < 0 || to < 0 || from >= list.length || to >= list.length) return list;
  const next = list.slice();
  next.splice(to, 0, ...next.splice(from, 1));
  return next;
}

interface Drag {
  /** Index of the row being dragged, -1 when idle. */
  from: SharedValue<number>;
  /** Slot the dragged row would land in. */
  over: SharedValue<number>;
  dy: SharedValue<number>;
}

interface RowProps {
  index: number;
  count: number;
  drag: Drag;
  onMove: (from: number, to: number) => void;
  /** `handle` wraps the drag grip passed to the content. */
  children: (handle: (grip: ReactNode) => ReactNode) => ReactNode;
}

/** Writes a shared value; kept out of the components because the React compiler lint rejects `.value =` on props. */
function put<T>(sv: SharedValue<T>, value: T) {
  "worklet";
  sv.value = value;
}

function Row({ index, count, drag, onMove, children }: RowProps) {
  const { from, over, dy } = drag;
  const pan = usePanGesture({
    // The handle claims a vertical drag at once, so the page scroll does not fight it.
    minDistance: 4,
    onActivate: () => {
      "worklet";
      put(from, index);
      put(over, index);
      put(dy, 0);
    },
    onUpdate: (e) => {
      "worklet";
      put(dy, e.translationY);
      put(over, Math.min(count - 1, Math.max(0, Math.round(index + e.translationY / ROW_HEIGHT))));
    },
    onFinalize: () => {
      "worklet";
      if (from.value !== index) return;
      const to = over.value;
      // The drag state is cleared by the list once React shows the new order (no flash of the old one).
      put(dy, withTiming((to - index) * ROW_HEIGHT, { duration: 120 }, () => {
        "worklet";
        scheduleOnRN(onMove, index, to);
      }));
    },
  });

  const style = useAnimatedStyle(() => {
    if (from.value === index) return { transform: [{ translateY: dy.value }, { scale: 1.02 }], zIndex: 10, opacity: 0.9 };
    let shift = 0;
    if (from.value >= 0) {
      if (from.value < index && index <= over.value) shift = -ROW_HEIGHT;
      else if (over.value <= index && index < from.value) shift = ROW_HEIGHT;
    }
    return { transform: [{ translateY: from.value < 0 ? 0 : withTiming(shift, { duration: 120 }) }, { scale: 1 }], zIndex: 0, opacity: 1 };
  });

  return (
    <Animated.View style={[styles.row, style]}>
      {children((grip) => (
        <GestureDetector gesture={pan}>{grip}</GestureDetector>
      ))}
    </Animated.View>
  );
}

/** Vertical list whose rows are reordered by dragging their grip (replaces the PWA dnd-kit list). Fixed-height rows. */
export function ReorderList<T>({
  items,
  keyOf,
  onMove,
  renderRow,
}: {
  items: T[];
  keyOf: (item: T) => string;
  onMove: (from: number, to: number) => void;
  renderRow: (item: T, index: number, handle: (grip: ReactNode) => ReactNode) => ReactNode;
}) {
  const from = useSharedValue(-1);
  const over = useSharedValue(-1);
  const dy = useSharedValue(0);
  const drag: Drag = { from, over, dy };
  const reset = () => {
    from.value = -1;
    dy.value = 0;
  };
  // eslint-disable-next-line react-hooks/exhaustive-deps -- runs when the new order is on screen
  useLayoutEffect(reset, [items]);
  const move = (a: number, b: number) => {
    onMove(a, b);
    if (a === b) reset();
  };
  return (
    <View style={{ height: items.length * ROW_HEIGHT }}>
      {items.map((item, i) => (
        <Row key={keyOf(item)} index={i} count={items.length} drag={drag} onMove={move}>
          {(handle) => renderRow(item, i, handle)}
        </Row>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { height: ROW_HEIGHT },
});
