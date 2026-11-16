import { HttpError, NetworkError, ReauthRequiredError, TimeoutError } from "@/api/errors";
import type { SyncEngine } from "@/sync";

export const REFRESH_CONFIRM = "Pobrać świeże dane z serwera i zaktualizować lokalną bazę?";
export const REFRESH_OK = "Pomyślnie zsynchronizowano dane z serwerem.";
export const REFRESH_FAILED = "Nie udało się zresetować lokalnego cache.";
export const DELETE_OFFLINE = "Usunięcie konta wymaga połączenia z internetem. Połącz się z siecią i spróbuj ponownie.";
export const DELETE_WRONG_PASSWORD = "Nieprawidłowe hasło";
export const DELETE_REAUTH = "Sesja wygasła. Zaloguj się ponownie, aby usunąć konto.";
export const DELETE_FAILED = "Nie udało się usunąć konta. Spróbuj ponownie.";

/** Confirmation text; with unsent changes it promises they are sent first (B6: the PWA lost them here). */
export const refreshConfirmText = (pending: number): string =>
  pending > 0 ? `${REFRESH_CONFIRM} Niewysłane zmiany (${pending}) zostaną najpierw wysłane.` : REFRESH_CONFIRM;

/**
 * "Odśwież pamięć podręczną": the engine pushes the outbox first and replaces local data from a snapshot only
 * after that succeeded, so a failure (offline, server error) leaves every unsent change in place.
 */
export async function refreshCache(engine: SyncEngine | null): Promise<string> {
  if (!engine) return REFRESH_FAILED;
  await engine.resync();
  const { status, lastError } = engine.getState();
  return status === "idle" && !lastError ? REFRESH_OK : REFRESH_FAILED;
}

export function deleteAccountError(error: unknown): string {
  if (error instanceof NetworkError || error instanceof TimeoutError) return DELETE_OFFLINE;
  if (error instanceof ReauthRequiredError) return DELETE_REAUTH;
  if (error instanceof HttpError && error.status === 403 && !error.message.startsWith("HTTP ")) return error.message;
  if (error instanceof HttpError && error.status === 403) return DELETE_WRONG_PASSWORD;
  return DELETE_FAILED;
}
