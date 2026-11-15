import { HttpError, NetworkError, TimeoutError } from "@/api/errors";

export const NETWORK_TEXT = "Brak połączenia z serwerem. Sprawdź internet i spróbuj ponownie.";
export const RATE_LIMIT_TEXT = "Zbyt wiele prób. Spróbuj ponownie później.";

/**
 * What the auth banner shows: the server's own text (PWA behaviour), the rate-limit text for 429,
 * the D-19 text without a network, or the PWA fallback.
 */
export function authErrorMessage(error: unknown, fallback: string): string {
  if (error instanceof NetworkError || error instanceof TimeoutError) return NETWORK_TEXT;
  if (error instanceof HttpError) {
    if (error.status === 429) return error.message.startsWith("HTTP ") ? RATE_LIMIT_TEXT : error.message;
    return error.message.startsWith("HTTP ") ? fallback : error.message;
  }
  return fallback;
}
