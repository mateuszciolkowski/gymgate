import rateLimit from "express-rate-limit";

const isTestEnv = process.env.NODE_ENV === "test";

/**
 * Limiter dla wrażliwych endpointów auth (login/register).
 * Chroni przed brute-force i enumeracją kont.
 * W środowisku testowym (NODE_ENV=test) jest pomijany, by nie zaburzać testów.
 */
export const authRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minut
  limit: 10, // maks. 10 prób na okno na IP
  standardHeaders: "draft-7",
  legacyHeaders: false,
  skip: () => isTestEnv,
  message: {
    success: false,
    error: "Zbyt wiele prób. Spróbuj ponownie później.",
  },
});
