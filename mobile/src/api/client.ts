import { API_BASE } from "./config";
import { HttpError, NetworkError, TimeoutError } from "./errors";

export const REQUEST_TIMEOUT_MS = 15_000;

/** Backend envelope: `{ success: true, data }` or `{ success: false, error }`. */
export type ApiEnvelope<T> = { success: true; data: T } | { success: false; error: string };

export interface TokenProvider {
  /** Current bearer token or null when signed out. Injected so the client knows nothing about storage. */
  getToken(): string | null | Promise<string | null>;
}

export interface ApiClientOptions {
  baseUrl?: string;
  tokenProvider?: TokenProvider;
  timeoutMs?: number;
  fetchImpl?: typeof fetch;
}

export interface RequestOptions {
  method?: "GET" | "POST" | "PUT" | "PATCH" | "DELETE";
  body?: unknown;
  headers?: Record<string, string>;
  /** Set false for public endpoints (login, register): no Authorization header is sent. */
  auth?: boolean;
}

function errorMessage(status: number, body: unknown): string {
  if (body && typeof body === "object") {
    const { error, message } = body as { error?: unknown; message?: unknown };
    if (typeof error === "string" && error) return error;
    if (typeof message === "string" && message) return message;
  }
  return `HTTP ${status}`;
}

async function readBody(response: Response): Promise<unknown> {
  const text = await response.text();
  if (!text) return undefined;
  try {
    return JSON.parse(text);
  } catch {
    return text;
  }
}

export function createApiClient(options: ApiClientOptions = {}) {
  const baseUrl = (options.baseUrl ?? API_BASE).replace(/\/+$/, "");
  const timeoutMs = options.timeoutMs ?? REQUEST_TIMEOUT_MS;
  const doFetch = options.fetchImpl ?? fetch;

  async function request<T>(path: string, opts: RequestOptions = {}): Promise<T> {
    const url = `${baseUrl}${path.startsWith("/") ? path : `/${path}`}`;
    const headers: Record<string, string> = { ...opts.headers };
    if (opts.body !== undefined) headers["Content-Type"] = "application/json";
    if (opts.auth !== false) {
      const token = await options.tokenProvider?.getToken();
      if (token) headers.Authorization = `Bearer ${token}`;
    }

    const controller = new AbortController();
    let timedOut = false;
    const timer = setTimeout(() => {
      timedOut = true;
      controller.abort();
    }, timeoutMs);

    let response: Response;
    try {
      response = await doFetch(url, {
        method: opts.method ?? "GET",
        headers,
        body: opts.body === undefined ? undefined : JSON.stringify(opts.body),
        signal: controller.signal,
      });
    } catch (error) {
      if (timedOut) throw new TimeoutError(`Request timed out after ${timeoutMs} ms: ${url}`);
      throw new NetworkError(error instanceof Error ? error.message : "Network request failed");
    } finally {
      clearTimeout(timer);
    }

    const body = await readBody(response);
    if (!response.ok)
      throw new HttpError(response.status, errorMessage(response.status, body), body);
    return body as T;
  }

  return {
    request,
    get: <T>(path: string, opts?: Omit<RequestOptions, "method" | "body">) =>
      request<T>(path, { ...opts, method: "GET" }),
    post: <T>(path: string, body?: unknown, opts?: Omit<RequestOptions, "method" | "body">) =>
      request<T>(path, { ...opts, method: "POST", body }),
    put: <T>(path: string, body?: unknown, opts?: Omit<RequestOptions, "method" | "body">) =>
      request<T>(path, { ...opts, method: "PUT", body }),
    patch: <T>(path: string, body?: unknown, opts?: Omit<RequestOptions, "method" | "body">) =>
      request<T>(path, { ...opts, method: "PATCH", body }),
    delete: <T>(path: string, opts?: Omit<RequestOptions, "method" | "body">) =>
      request<T>(path, { ...opts, method: "DELETE" }),
  };
}

export type ApiClient = ReturnType<typeof createApiClient>;
