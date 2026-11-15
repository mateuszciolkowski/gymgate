import { PendingChangesError, type AccountSwitchOptions } from "@/session";
import { authErrorMessage } from "./messages";

export const SWITCH_DECLINED_TEXT = "Logowanie anulowane";

/**
 * Runs a login/register call for the auth screens: another account's unsent changes need an explicit yes
 * (`confirmSwitch`), every failure becomes the banner text of the PWA / D-19.
 */
export async function authenticate(
  run: (o?: AccountSwitchOptions) => Promise<unknown>,
  confirmSwitch: (pending: number) => Promise<boolean>,
  fallback: string,
): Promise<void> {
  try {
    await run();
  } catch (error) {
    if (!(error instanceof PendingChangesError)) throw new Error(authErrorMessage(error, fallback));
    if (!(await confirmSwitch(error.pending))) throw new Error(SWITCH_DECLINED_TEXT);
    try {
      await run({ allowAccountSwitch: true });
    } catch (retryError) {
      throw new Error(authErrorMessage(retryError, fallback));
    }
  }
}

export const switchPrompt = (pending: number): string =>
  `Na tym urządzeniu czekają niewysłane zmiany innego konta (${pending}). Zostaną na urządzeniu do ponownego zalogowania na tamto konto.`;
