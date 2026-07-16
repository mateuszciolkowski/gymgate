import { beforeEach, describe, expect, it, vi } from "vitest";
import { createMockRes } from "../../test/mockResponse.js";
import { NotFoundError } from "../../common/errors.js";

vi.mock("./user.service.js", () => ({
  getUserById: vi.fn(),
}));

import { getUserById as getUserController } from "./user.controller.js";
import { getUserById as getUserService } from "./user.service.js";

const makeReq = (overrides: Record<string, unknown> = {}) =>
  ({ params: {}, body: {}, query: {}, ...overrides }) as any;

describe("user.controller getUserById", () => {
  beforeEach(() => vi.clearAllMocks());

  it("właściciel: zwraca własne dane", async () => {
    const user = { id: "u1", email: "a@a.com" };
    vi.mocked(getUserService).mockResolvedValue(user as any);
    const res = createMockRes();

    await getUserController(makeReq({ params: { id: "u1" }, userId: "u1" }), res);

    expect(getUserService).toHaveBeenCalledWith("u1");
    expect(res.statusCode).toBe(200);
    expect(res.body).toEqual({ success: true, data: user });
  });

  it("admin: może pobrać dane innego użytkownika", async () => {
    const user = { id: "u2" };
    vi.mocked(getUserService).mockResolvedValue(user as any);
    const res = createMockRes();

    await getUserController(
      makeReq({ params: { id: "u2" }, userId: "admin", userIsAdmin: true }),
      res,
    );

    expect(res.statusCode).toBe(200);
    expect(res.body).toEqual({ success: true, data: user });
  });

  it("obcy nie-admin: 403 i NIE woła serwisu (brak wycieku)", async () => {
    const res = createMockRes();

    await getUserController(
      makeReq({ params: { id: "u2" }, userId: "u1", userIsAdmin: false }),
      res,
    );

    expect(res.statusCode).toBe(403);
    expect(res.body).toEqual({
      success: false,
      error: "Brak uprawnień do danych tego użytkownika",
    });
    expect(getUserService).not.toHaveBeenCalled();
  });

  it("brak id w params: 400", async () => {
    const res = createMockRes();

    await getUserController(makeReq({ params: {}, userId: "u1" }), res);

    expect(res.statusCode).toBe(400);
  });

  it("self ale user nie istnieje: 404", async () => {
    vi.mocked(getUserService).mockRejectedValue(new NotFoundError("User not found"));
    const res = createMockRes();

    await getUserController(makeReq({ params: { id: "u1" }, userId: "u1" }), res);

    expect(res.statusCode).toBe(404);
  });
});
