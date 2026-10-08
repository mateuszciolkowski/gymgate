// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { authFetch, FETCH_TIMEOUT_MS, RequestTimeoutError } from "./auth";

describe("authFetch timeout", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });
  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
  });

  it("rejects with a TypeError subclass when the request hangs (weak signal)", async () => {
    vi.stubGlobal(
      "fetch",
      (_url: string, init: RequestInit) =>
        new Promise((_resolve, reject) => {
          init.signal?.addEventListener("abort", () =>
            reject(new DOMException("aborted", "AbortError")),
          );
        }),
    );

    const promise = authFetch("http://x/api/test");
    const assertion = expect(promise).rejects.toBeInstanceOf(RequestTimeoutError);
    await vi.advanceTimersByTimeAsync(FETCH_TIMEOUT_MS + 1);
    await assertion;
    await expect(promise).rejects.toBeInstanceOf(TypeError);
  });

  it("returns the response when the server answers in time", async () => {
    vi.stubGlobal("fetch", async () => ({ ok: true, status: 200 }));
    const res = await authFetch("http://x/api/test");
    expect(res.status).toBe(200);
  });
});
