import { registerSW } from "virtual:pwa-register";

/**
 * Manual PWA updates. The service worker is registered in "prompt" mode: a new
 * version is downloaded and precached in the background but only activated when
 * the user taps the banner. The app therefore never reloads by itself in the
 * middle of a workout, and the old fully-cached version keeps working offline
 * until the new one is completely downloaded.
 */
type Listener = (needRefresh: boolean) => void;

let needRefresh = false;
let applyUpdate: ((reloadPage?: boolean) => Promise<void>) | null = null;
const listeners = new Set<Listener>();

export const initPwaUpdates = (): void => {
  applyUpdate = registerSW({
    immediate: true,
    onNeedRefresh() {
      needRefresh = true;
      listeners.forEach((cb) => cb(true));
    },
  });
};

export const subscribePwaUpdate = (cb: Listener): (() => void) => {
  listeners.add(cb);
  cb(needRefresh);
  return () => {
    listeners.delete(cb);
  };
};

export const applyPwaUpdate = async (): Promise<void> => {
  await applyUpdate?.(true);
};
