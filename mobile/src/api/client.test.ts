import { createApiClient } from "./client";
import { HttpError, NetworkError, TimeoutError, isTransient } from "./errors";

function jsonResponse(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

function mockFetch(impl: (url: string, init: RequestInit) => Promise<Response>) {
  return jest.fn(impl) as jest.MockedFunction<typeof fetch>;
}

describe("createApiClient", () => {
  afterEach(() => jest.useRealTimers());

  it("builds the URL from the base, strips trailing slashes and parses JSON", async () => {
    const fetchImpl = mockFetch(async () => jsonResponse(200, { success: true, data: { id: 1 } }));
    const api = createApiClient({ baseUrl: "http://x.test/", fetchImpl });
    await expect(api.get("/api/ping")).resolves.toEqual({ success: true, data: { id: 1 } });
    expect(fetchImpl.mock.calls[0]![0]).toBe("http://x.test/api/ping");
    expect(fetchImpl.mock.calls[0]![1]!.method).toBe("GET");
  });

  it("injects the bearer token from the token provider", async () => {
    const fetchImpl = mockFetch(async () => jsonResponse(200, {}));
    const api = createApiClient({
      baseUrl: "http://x.test",
      fetchImpl,
      tokenProvider: { getToken: async () => "tok123" },
    });
    await api.get("/a");
    const headers = fetchImpl.mock.calls[0]![1]!.headers as Record<string, string>;
    expect(headers.Authorization).toBe("Bearer tok123");
  });

  it("sends no Authorization header when signed out or auth=false", async () => {
    const fetchImpl = mockFetch(async () => jsonResponse(200, {}));
    const signedOut = createApiClient({
      baseUrl: "http://x.test",
      fetchImpl,
      tokenProvider: { getToken: () => null },
    });
    await signedOut.get("/a");
    const withToken = createApiClient({
      baseUrl: "http://x.test",
      fetchImpl,
      tokenProvider: { getToken: () => "t" },
    });
    await withToken.post("/login", { a: 1 }, { auth: false });
    expect(
      (fetchImpl.mock.calls[0]![1]!.headers as Record<string, string>).Authorization,
    ).toBeUndefined();
    expect(
      (fetchImpl.mock.calls[1]![1]!.headers as Record<string, string>).Authorization,
    ).toBeUndefined();
  });

  it("serialises the body as JSON with a content type", async () => {
    const fetchImpl = mockFetch(async () => jsonResponse(201, {}));
    const api = createApiClient({ baseUrl: "http://x.test", fetchImpl });
    await api.post("/things", { name: "x" });
    const init = fetchImpl.mock.calls[0]![1]!;
    expect(init.method).toBe("POST");
    expect(init.body).toBe('{"name":"x"}');
    expect((init.headers as Record<string, string>)["Content-Type"]).toBe("application/json");
  });

  it("returns undefined for an empty body (204)", async () => {
    const fetchImpl = mockFetch(async () => new Response(null, { status: 204 }));
    const api = createApiClient({ baseUrl: "http://x.test", fetchImpl });
    await expect(api.delete("/x")).resolves.toBeUndefined();
  });

  it("throws HttpError with status and the server's error text", async () => {
    const fetchImpl = mockFetch(async () =>
      jsonResponse(401, { success: false, error: "Brak tokenu autoryzacji" }),
    );
    const api = createApiClient({ baseUrl: "http://x.test", fetchImpl });
    const err = await api.get("/me").catch((e: unknown) => e);
    expect(err).toBeInstanceOf(HttpError);
    expect((err as HttpError).status).toBe(401);
    expect((err as HttpError).message).toBe("Brak tokenu autoryzacji");
    expect((err as HttpError).body).toEqual({ success: false, error: "Brak tokenu autoryzacji" });
  });

  it("falls back to 'HTTP <status>' when the body has no message", async () => {
    const fetchImpl = mockFetch(async () => new Response("boom", { status: 502 }));
    const api = createApiClient({ baseUrl: "http://x.test", fetchImpl });
    await expect(api.get("/x")).rejects.toMatchObject({ status: 502, message: "HTTP 502" });
  });

  it("throws NetworkError when fetch rejects", async () => {
    const fetchImpl = mockFetch(async () => {
      throw new TypeError("Network request failed");
    });
    const api = createApiClient({ baseUrl: "http://x.test", fetchImpl });
    const err = await api.get("/x").catch((e: unknown) => e);
    expect(err).toBeInstanceOf(NetworkError);
    expect(err).not.toBeInstanceOf(TimeoutError);
  });

  it("throws TimeoutError after the timeout (15 s by default)", async () => {
    jest.useFakeTimers();
    const fetchImpl = mockFetch(
      (_url, init) =>
        new Promise((_resolve, reject) => {
          init.signal!.addEventListener("abort", () =>
            reject(new DOMException("Aborted", "AbortError")),
          );
        }),
    );
    const api = createApiClient({ baseUrl: "http://x.test", fetchImpl });
    const pending = api.get("/slow").catch((e: unknown) => e);
    await jest.advanceTimersByTimeAsync(14_999);
    let settled = false;
    void pending.then(() => (settled = true));
    await Promise.resolve();
    expect(settled).toBe(false);
    await jest.advanceTimersByTimeAsync(1);
    expect(await pending).toBeInstanceOf(TimeoutError);
  });
});

describe("isTransient", () => {
  it("is true for network, timeout, 5xx and 429", () => {
    expect(isTransient(new NetworkError("x"))).toBe(true);
    expect(isTransient(new TimeoutError("x"))).toBe(true);
    expect(isTransient(new HttpError(503, "x", null))).toBe(true);
    expect(isTransient(new HttpError(429, "x", null))).toBe(true);
  });
  it("is false for other 4xx and unknown errors", () => {
    expect(isTransient(new HttpError(401, "x", null))).toBe(false);
    expect(isTransient(new HttpError(400, "x", null))).toBe(false);
    expect(isTransient(new Error("x"))).toBe(false);
  });
});
