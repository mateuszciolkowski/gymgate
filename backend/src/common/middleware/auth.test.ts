import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import jwt from "jsonwebtoken";

type AuthModule = typeof import("./auth.js");

const SECRET = "test-secret-mw";

const loadMiddleware = async (secret: string | undefined): Promise<AuthModule> => {
  vi.resetModules();
  if (secret === undefined) {
    delete process.env.JWT_SECRET;
  } else {
    process.env.JWT_SECRET = secret;
  }
  return (await import("./auth.js")) as AuthModule;
};

const makeReqRes = (authHeader?: string) => {
  const req: any = { headers: authHeader ? { authorization: authHeader } : {} };
  const res: any = {
    statusCode: 0,
    body: undefined,
    status(code: number) {
      this.statusCode = code;
      return this;
    },
    json(payload: unknown) {
      this.body = payload;
      return this;
    },
  };
  const next = vi.fn();
  return { req, res, next };
};

describe("authMiddleware", () => {
  const originalSecret = process.env.JWT_SECRET;

  beforeEach(() => vi.clearAllMocks());
  afterEach(() => {
    process.env.JWT_SECRET = originalSecret;
  });

  it("500 gdy brak JWT_SECRET", async () => {
    const { authMiddleware } = await loadMiddleware(undefined);
    const token = jwt.sign({ userId: "u1", email: "a@a.com" }, "whatever");
    const { req, res, next } = makeReqRes(`Bearer ${token}`);

    authMiddleware(req, res, next);

    expect(res.statusCode).toBe(500);
    expect(next).not.toHaveBeenCalled();
  });

  it("401 gdy brak tokenu", async () => {
    const { authMiddleware } = await loadMiddleware(SECRET);
    const { req, res, next } = makeReqRes();

    authMiddleware(req, res, next);

    expect(res.statusCode).toBe(401);
    expect(res.body).toEqual({ success: false, error: "Brak tokenu autoryzacji" });
    expect(next).not.toHaveBeenCalled();
  });

  it("401 gdy token nieprawidłowy", async () => {
    const { authMiddleware } = await loadMiddleware(SECRET);
    const { req, res, next } = makeReqRes("Bearer not.a.valid.token");

    authMiddleware(req, res, next);

    expect(res.statusCode).toBe(401);
    expect(next).not.toHaveBeenCalled();
  });

  it("401 gdy token podpisany innym sekretem", async () => {
    const { authMiddleware } = await loadMiddleware(SECRET);
    const token = jwt.sign({ userId: "u1", email: "a@a.com" }, "inny-sekret");
    const { req, res, next } = makeReqRes(`Bearer ${token}`);

    authMiddleware(req, res, next);

    expect(res.statusCode).toBe(401);
  });

  it("przepuszcza poprawny token i ustawia userId/email/isAdmin", async () => {
    const { authMiddleware } = await loadMiddleware(SECRET);
    const token = jwt.sign(
      { userId: "u1", email: "a@a.com", isAdmin: true },
      SECRET,
    );
    const { req, res, next } = makeReqRes(`Bearer ${token}`);

    authMiddleware(req, res, next);

    expect(next).toHaveBeenCalledTimes(1);
    expect(req.userId).toBe("u1");
    expect(req.userEmail).toBe("a@a.com");
    expect(req.userIsAdmin).toBe(true);
  });

  it("domyślny isAdmin=false gdy brak w tokenie", async () => {
    const { authMiddleware } = await loadMiddleware(SECRET);
    const token = jwt.sign({ userId: "u2", email: "b@b.com" }, SECRET);
    const { req, res, next } = makeReqRes(`Bearer ${token}`);

    authMiddleware(req, res, next);

    expect(req.userIsAdmin).toBe(false);
    expect(next).toHaveBeenCalledTimes(1);
  });
});
