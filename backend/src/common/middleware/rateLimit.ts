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
