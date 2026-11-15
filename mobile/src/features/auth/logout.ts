import { PendingChangesError, type Session } from "@/session";

export type LogoutChoice = "keep" | "discard";

/**
 * Logout with the unsent-changes decision of MIGRACJA 6.6 / D-14: with a non-empty outbox the user chooses to keep the
 * data on the device or discard it; `null` (cancel) leaves the session untouched.
 */
export async function logoutWithPrompt(logout: Session["logout"], ask: (pending: number) => Promise<LogoutChoice | null>): Promise<void> {
  try {
    await logout();
  } catch (error) {
    if (!(error instanceof PendingChangesError)) throw error;
    const choice = await ask(error.pending);
    if (choice) await logout({ pendingChanges: choice });
  }
}
