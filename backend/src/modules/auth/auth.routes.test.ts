import { describe, expect, it } from "vitest";
import router from "./auth.routes.js";
import { authRateLimiter } from "../../common/middleware/rateLimit.js";

type Layer = { route?: { path: string; methods: Record<string, boolean>; stack: Array<{ handle: unknown }> } };

const handlersOf = (path: string) =>
  (router.stack as unknown as Layer[]).find((l) => l.route?.path === path)?.route?.stack.map((s) => s.handle) ?? [];

describe("auth routes: rate limiting", () => {
  it.each(["/login", "/register", "/mobile/login", "/mobile/register"])("%s uses the shared auth rate limiter", (path) => {
    expect(handlersOf(path)).toContain(authRateLimiter);
  });
});
