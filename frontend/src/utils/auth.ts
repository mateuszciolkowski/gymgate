export function getAuthHeaders(): HeadersInit {
  const token = localStorage.getItem("gymgate_token");
  return {
    "Content-Type": "application/json",
    ...(token && { Authorization: `Bearer ${token}` }),
  };
}

// On a weak mobile connection (e.g. iPhone on LTE with 1 bar) fetch can hang for
// minutes without ever rejecting, so optimistic callers never reach their
// offline fallback. Abort after a timeout and surface it as a network error.
export const FETCH_TIMEOUT_MS = 15_000;

/** Thrown when a request exceeds the timeout. Extends TypeError so existing offline checks treat it as a network failure. */
export class RequestTimeoutError extends TypeError {
  constructor(url: string) {
    super(`Request timed out: ${url}`);
    this.name = "RequestTimeoutError";
  }
}

export async function authFetch(url: string, options: RequestInit = {}) {
  const token = localStorage.getItem("gymgate_token");

  const controller = new AbortController();
  let timedOut = false;
  const timer = window.setTimeout(() => {
    timedOut = true;
    controller.abort();
  }, FETCH_TIMEOUT_MS);
  options.signal?.addEventListener("abort", () => controller.abort(), { once: true });

  let response: Response;
  try {
    response = await fetch(url, {
      ...options,
      signal: controller.signal,
      cache: options.cache ?? "no-store",
      headers: {
        ...options.headers,
        ...(token && { Authorization: `Bearer ${token}` }),
      },
    });
  } catch (error) {
    if (timedOut) throw new RequestTimeoutError(url);
    throw error;
  } finally {
    window.clearTimeout(timer);
  }

  if (response.status === 401 && token) {
    localStorage.removeItem("gymgate_token");
    window.location.reload();
    throw new Error("Sesja wygasła. Zaloguj się ponownie.");
  }

  return response;
}
