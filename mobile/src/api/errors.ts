/** Base class so callers can `instanceof ApiError` to separate API failures from programming errors. */
export class ApiError extends Error {
  constructor(message: string) {
    super(message);
    this.name = new.target.name;
  }
}

/** No response at all (offline, DNS, connection refused). Never a reason to log the user out. */
export class NetworkError extends ApiError {}

/** Request exceeded the timeout (weak connection can hang fetch for minutes). Treated like a network failure. */
export class TimeoutError extends ApiError {}

/** Server answered with a non-2xx status. `message` is the server's `error` text when it sent one. */
export class HttpError extends ApiError {
  constructor(
    readonly status: number,
    message: string,
    readonly body: unknown,
  ) {
    super(message);
  }
}

/** True for failures where retrying later makes sense: no connection, timeout, 5xx, 429. */
export function isTransient(error: unknown): boolean {
  if (error instanceof NetworkError || error instanceof TimeoutError) return true;
  return error instanceof HttpError && (error.status >= 500 || error.status === 429);
}

/** The refresh token was refused (expired or revoked): the user must sign in again. Local data and the outbox stay. */
export class ReauthRequiredError extends ApiError {
  constructor() {
    super("Re-login required");
  }
}
