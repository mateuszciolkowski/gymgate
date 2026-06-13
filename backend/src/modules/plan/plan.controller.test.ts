import { beforeEach, describe, expect, it, vi } from "vitest";
import { createMockRes } from "../../test/mockResponse.js";
import { ForbiddenError, NotFoundError, ConflictError } from "../../common/errors.js";

const serviceMethods = {
  getAllPlans: vi.fn(),
  getPlanById: vi.fn(),
  createPlan: vi.fn(),
  updatePlan: vi.fn(),
  deletePlan: vi.fn(),
  duplicatePlan: vi.fn(),
  favoritePlan: vi.fn(),
  unfavoritePlan: vi.fn(),
};

vi.mock("./plan.service.js", () => ({
  PlanService: vi.fn(function () {
    return serviceMethods;
  }),
}));

import { PlanController } from "./plan.controller.js";

const makeReq = (overrides: Record<string, unknown> = {}) =>
  ({ params: {}, body: {}, query: {}, ...overrides }) as any;

describe("PlanController", () => {
  let controller: PlanController;

  beforeEach(() => {
    vi.clearAllMocks();
    controller = new PlanController();
  });

  it("getAll: domyślny tab 'mine', zwraca count", async () => {
    serviceMethods.getAllPlans.mockResolvedValue([{ id: "p1" }]);
    const res = createMockRes();

    await controller.getAll(makeReq({ userId: "u1" }), res);

    expect(serviceMethods.getAllPlans).toHaveBeenCalledWith("mine", "u1");
    expect(res.body).toEqual({ success: true, data: [{ id: "p1" }], count: 1 });
  });

  it("getAll: respektuje query.tab", async () => {
    serviceMethods.getAllPlans.mockResolvedValue([]);
    const res = createMockRes();

    await controller.getAll(makeReq({ userId: "u1", query: { tab: "community" } }), res);

    expect(serviceMethods.getAllPlans).toHaveBeenCalledWith("community", "u1");
  });

  it("getById: NotFoundError -> 404", async () => {
    serviceMethods.getPlanById.mockRejectedValue(new NotFoundError("Plan not found"));
    const res = createMockRes();

    await controller.getById(makeReq({ params: { id: "p1" }, userId: "u1" }), res);

    expect(res.statusCode).toBe(404);
  });

  it("create: 201 z danymi", async () => {
    serviceMethods.createPlan.mockResolvedValue({ id: "p1" });
    const res = createMockRes();

    await controller.create(makeReq({ body: { name: "Plan" }, userId: "u1" }), res);

    expect(serviceMethods.createPlan).toHaveBeenCalledWith({ name: "Plan" }, "u1");
    expect(res.statusCode).toBe(201);
  });

  it("create: ConflictError -> 409", async () => {
    serviceMethods.createPlan.mockRejectedValue(
      new ConflictError("Plan with this name already exists"),
    );
    const res = createMockRes();

    await controller.create(makeReq({ body: {}, userId: "u1" }), res);

    expect(res.statusCode).toBe(409);
  });

  it("update: ForbiddenError -> 403", async () => {
    serviceMethods.updatePlan.mockRejectedValue(
      new ForbiddenError("You can only edit your own plans"),
    );
    const res = createMockRes();

    await controller.update(makeReq({ params: { id: "p1" }, body: {}, userId: "u1" }), res);

    expect(res.statusCode).toBe(403);
  });

  it("delete: 204", async () => {
    serviceMethods.deletePlan.mockResolvedValue(undefined);
    const res = createMockRes();

    await controller.delete(makeReq({ params: { id: "p1" }, userId: "u1" }), res);

    expect(serviceMethods.deletePlan).toHaveBeenCalledWith("p1", "u1");
    expect(res.statusCode).toBe(204);
  });

  it("duplicate: 201", async () => {
    serviceMethods.duplicatePlan.mockResolvedValue({ id: "p2" });
    const res = createMockRes();

    await controller.duplicate(makeReq({ params: { id: "p1" }, userId: "u1" }), res);

    expect(res.statusCode).toBe(201);
  });

  it("favorite: 200 success", async () => {
    serviceMethods.favoritePlan.mockResolvedValue(undefined);
    const res = createMockRes();

    await controller.favorite(makeReq({ params: { id: "p1" }, userId: "u1" }), res);

    expect(res.body).toEqual({ success: true });
  });

  it("unfavorite: 204", async () => {
    serviceMethods.unfavoritePlan.mockResolvedValue(undefined);
    const res = createMockRes();

    await controller.unfavorite(makeReq({ params: { id: "p1" }, userId: "u1" }), res);

    expect(res.statusCode).toBe(204);
  });
});
