import { beforeEach, describe, expect, it, vi } from "vitest";
import { createMockRes } from "../../test/mockResponse.js";
import { ConflictError, UnauthorizedError, NotFoundError } from "../../common/errors.js";

vi.mock("./auth.service.js", () => ({
  register: vi.fn(),
  login: vi.fn(),
}));

vi.mock("../user/user.service.js", () => ({
  getUserById: vi.fn(),
}));

import * as authController from "./auth.controller.js";
import * as authService from "./auth.service.js";
import { getUserById } from "../user/user.service.js";

const makeReq = (overrides: Record<string, unknown> = {}) =>
  ({ params: {}, body: {}, query: {}, ...overrides }) as any;

describe("auth.controller", () => {
  beforeEach(() => vi.clearAllMocks());

  describe("register", () => {
    it("zwraca 201 i dane przy sukcesie", async () => {
      const payload = { user: { id: "u1" }, token: "tok" };
      vi.mocked(authService.register).mockResolvedValue(payload as any);
      const res = createMockRes();

      await authController.register(
        makeReq({ body: { email: "a@a.com" } }),
        res,
      );

      expect(res.statusCode).toBe(201);
      expect(res.body).toEqual({ success: true, data: payload });
    });

    it("mapuje ConflictError na 409", async () => {
      vi.mocked(authService.register).mockRejectedValue(
        new ConflictError("Użytkownik z tym emailem już istnieje"),
      );
      const res = createMockRes();

      await authController.register(makeReq(), res);

      expect(res.statusCode).toBe(409);
      expect(res.body).toEqual({
        success: false,
        error: "Użytkownik z tym emailem już istnieje",
      });
    });

    it("nieznany błąd -> 500", async () => {
      vi.mocked(authService.register).mockRejectedValue(new Error("boom"));
      const res = createMockRes();

      await authController.register(makeReq(), res);

      expect(res.statusCode).toBe(500);
      expect(res.body).toEqual({
        success: false,
        error: "Internal server error",
      });
    });
  });

  describe("login", () => {
    it("zwraca 200 i dane przy sukcesie", async () => {
      const payload = { user: { id: "u1" }, token: "tok" };
      vi.mocked(authService.login).mockResolvedValue(payload as any);
      const res = createMockRes();

      await authController.login(makeReq(), res);

      expect(res.statusCode).toBe(200);
      expect(res.body).toEqual({ success: true, data: payload });
    });

    it("mapuje UnauthorizedError na 401", async () => {
      vi.mocked(authService.login).mockRejectedValue(
        new UnauthorizedError("Nieprawidłowy email lub hasło"),
      );
      const res = createMockRes();

      await authController.login(makeReq(), res);

      expect(res.statusCode).toBe(401);
      expect(res.body).toEqual({
        success: false,
        error: "Nieprawidłowy email lub hasło",
      });
    });
  });

  describe("getCurrentUser", () => {
    it("zwraca usera dla req.userId z middleware", async () => {
      const user = { id: "u1", email: "a@a.com" };
      vi.mocked(getUserById).mockResolvedValue(user as any);
      const res = createMockRes();

      await authController.getCurrentUser(makeReq({ userId: "u1" }), res);

      expect(getUserById).toHaveBeenCalledWith("u1");
      expect(res.statusCode).toBe(200);
      expect(res.body).toEqual({ success: true, data: user });
    });

    it("mapuje NotFoundError na 404", async () => {
      vi.mocked(getUserById).mockRejectedValue(new NotFoundError("User not found"));
      const res = createMockRes();

      await authController.getCurrentUser(makeReq({ userId: "ghost" }), res);

      expect(res.statusCode).toBe(404);
    });
  });
});
