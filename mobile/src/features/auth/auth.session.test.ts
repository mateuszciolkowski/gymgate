import { HttpError, NetworkError, TimeoutError } from "@/api/errors";
import { PendingChangesError } from "@/session";
import { authenticate, SWITCH_DECLINED_TEXT } from "./authenticate";
import { authErrorMessage, NETWORK_TEXT, RATE_LIMIT_TEXT } from "./messages";
import { logoutWithPrompt } from "./logout";

describe("authErrorMessage", () => {
  it("maps network failures to the D-19 text", () => {
    expect(authErrorMessage(new NetworkError("x"), "f")).toBe(NETWORK_TEXT);
    expect(authErrorMessage(new TimeoutError("x"), "f")).toBe(NETWORK_TEXT);
  });
  it("shows the server's text, the rate-limit text for a bare 429, and the fallback otherwise", () => {
    expect(authErrorMessage(new HttpError(401, "Nieprawidłowy email lub hasło", {}), "f")).toBe("Nieprawidłowy email lub hasło");
    expect(authErrorMessage(new HttpError(429, "Zbyt wiele prób. Spróbuj ponownie później.", {}), "f")).toBe("Zbyt wiele prób. Spróbuj ponownie później.");
    expect(authErrorMessage(new HttpError(429, "HTTP 429", {}), "f")).toBe(RATE_LIMIT_TEXT);
    expect(authErrorMessage(new HttpError(500, "HTTP 500", {}), "Błąd logowania")).toBe("Błąd logowania");
    expect(authErrorMessage(new Error("boom"), "Błąd logowania")).toBe("Błąd logowania");
  });
});

describe("authenticate", () => {
  it("retries with consent when another account has unsent changes", async () => {
    const run = jest.fn().mockRejectedValueOnce(new PendingChangesError(3)).mockResolvedValueOnce(undefined);
    await authenticate(run, async () => true, "f");
    expect(run).toHaveBeenLastCalledWith({ allowAccountSwitch: true });
  });
  it("stops when the user declines", async () => {
    const run = jest.fn().mockRejectedValue(new PendingChangesError(1));
    await expect(authenticate(run, async () => false, "f")).rejects.toThrow(SWITCH_DECLINED_TEXT);
    expect(run).toHaveBeenCalledTimes(1);
  });
  it("turns failures into banner text", async () => {
    await expect(authenticate(() => Promise.reject(new NetworkError("x")), async () => true, "f")).rejects.toThrow(NETWORK_TEXT);
  });
});

describe("logoutWithPrompt", () => {
  it("asks only when changes are pending and passes the choice on", async () => {
    const logout = jest.fn().mockRejectedValueOnce(new PendingChangesError(2)).mockResolvedValueOnce(undefined);
    await logoutWithPrompt(logout, async () => "keep");
    expect(logout).toHaveBeenLastCalledWith({ pendingChanges: "keep" });
  });
  it("leaves the session alone on cancel and rethrows other errors", async () => {
    const logout = jest.fn().mockRejectedValue(new PendingChangesError(2));
    await logoutWithPrompt(logout, async () => null);
    expect(logout).toHaveBeenCalledTimes(1);
    await expect(logoutWithPrompt(() => Promise.reject(new Error("x")), async () => null)).rejects.toThrow("x");
  });
});
