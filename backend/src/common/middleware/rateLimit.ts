import rateLimit from "express-rate-limit";

const isTestEnv = process.env.NODE_ENV === "test";

/**
 * Rate limiter for sensitive auth endpoints (login/register).
 * Protects against brute-force attacks and account enumeration.
 * Skipped in the test environment (NODE_ENV=test) so it does not interfere with tests.
 */
export const authRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  limit: 10, // max 10 attempts per window per IP
  standardHeaders: "draft-7",
  legacyHeaders: false,
  skip: () => isTestEnv,
  message: {
    success: false,
    error: "Zbyt wiele prób. Spróbuj ponownie później.",
  },
});

/**
 * Per-user limiter for POST /api/sync/push: 60 requests per minute (PLAN 6.6).
 * Must be mounted after authMiddleware (keyed by user id). `skipInTest` lets
 * unit tests exercise the real limiter; the app instance is skipped under NODE_ENV=test.
 */
export const createUserRateLimiter = (limit: number, skipInTest = true) =>
  rateLimit({
    windowMs: 60 * 1000,
    limit,
    standardHeaders: "draft-7",
    legacyHeaders: false,
    skip: () => skipInTest && isTestEnv,
    keyGenerator: (req) => (req as { userId?: string }).userId ?? "anonymous",
    message: { success: false, error: "Zbyt wiele żądań synchronizacji. Spróbuj ponownie za chwilę." },
  });

export const syncRateLimiter = createUserRateLimiter(60);
export const syncPullRateLimiter = createUserRateLimiter(60);
