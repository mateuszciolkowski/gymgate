/** Gesture constants of the PWA drawer (NavigationDrawer.tsx). */
export const DRAWER_MAX_WIDTH = 330;
export const DRAWER_WIDTH_FRACTION = 0.82;
export const OPEN_THRESHOLD = 0.35;
export const CLOSE_THRESHOLD = 0.3;
export const DRAG_START_SLOP = 8;
export const EDGE_ZONE_WIDTH = 24;

export const drawerWidth = (screenWidth: number) => Math.min(screenWidth * DRAWER_WIDTH_FRACTION, DRAWER_MAX_WIDTH);

/** Swipe from the left edge by `offset` px opens the drawer when it covers >= 35% of the panel width. */
// Called from gesture worklets on the UI thread: must be worklets, or Release builds crash on the swipe.
export function shouldOpen(offset: number, width: number) {
  "worklet";
  return offset >= width * OPEN_THRESHOLD;
}

/** Swipe to the left by `offset` px closes the drawer when it covers >= 30% of the panel width. */
export function shouldClose(offset: number, width: number) {
  "worklet";
  return offset >= width * CLOSE_THRESHOLD;
}
