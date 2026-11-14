import { beforeEach, describe, expect, it, vi } from "vitest";

const { transactionMock } = vi.hoisted(() => ({ transactionMock: vi.fn() }));

vi.mock("../../config/database.js", () => ({
  default: { $transaction: transactionMock },
}));

import { PlanRepository } from "./plan.repository.js";

const planRow = (exerciseIds: string[], name = "Push") => ({
  id: "p1",
  name,
  shortName: null,
  isPublic: false,
  creatorUserId: "u1",
  updatedAt: new Date("2026-01-01"),
  favoritedBy: [],
  items: exerciseIds.map((id, i) => ({ exerciseId: id, orderInPlan: i, exercise: { name: `n-${id}` } })),
});

function makeTx(opts: { before?: ReturnType<typeof planRow>; after: ReturnType<typeof planRow>; latest?: unknown }) {
  return {
    workoutPlan: {
      create: vi.fn().mockResolvedValue(opts.after),
      findUniqueOrThrow: vi.fn().mockResolvedValue(opts.before),
      update: vi.fn().mockResolvedValue(opts.after),
    },
    workoutPlanItem: { deleteMany: vi.fn(), createMany: vi.fn() },
    workoutPlanVersion: {
      create: vi.fn(),
      createMany: vi.fn(),
      findFirst: vi.fn().mockResolvedValue(opts.latest ?? null),
    },
  };
}

describe("PlanRepository version writes", () => {
  const repo = new PlanRepository();

  beforeEach(() => vi.clearAllMocks());

  const run = (tx: ReturnType<typeof makeTx>) =>
    transactionMock.mockImplementation(async (cb: (t: unknown) => unknown) => cb(tx));

  it("create writes v1 with the exercise snapshot", async () => {
    const tx = makeTx({ after: planRow(["a"]) });
    run(tx);

    await repo.create({ name: "Push", creatorUserId: "u1", isPublic: false, exerciseIds: ["a"] });

    expect(tx.workoutPlanVersion.create).toHaveBeenCalledWith({
      data: expect.objectContaining({ planId: "p1", version: 1, exercises: [{ exerciseId: "a", name: "n-a" }] }),
    });
  });

  it("first edit of a plan without history writes pre-edit v1 (dated) and new v2", async () => {
    const tx = makeTx({ before: planRow(["a"]), after: planRow(["a", "b"]) });
    run(tx);

    await repo.update("p1", { exerciseIds: ["a", "b"] }, "u1");

    const rows = tx.workoutPlanVersion.createMany.mock.calls[0]![0].data;
    expect(rows.map((r: { version: number }) => r.version)).toEqual([1, 2]);
    expect(rows[0].createdAt).toEqual(new Date("2026-01-01"));
    expect(rows[1].createdAt).toBeUndefined();
  });

  it("no-op save with existing history writes nothing", async () => {
    const latest = {
      version: 3,
      name: "Push",
      shortName: null,
      isPublic: false,
      exercises: [{ exerciseId: "a", name: "n-a" }],
    };
    const tx = makeTx({ before: planRow(["a"]), after: planRow(["a"]), latest });
    run(tx);

    await repo.update("p1", {}, "u1");

    expect(tx.workoutPlanVersion.createMany).not.toHaveBeenCalled();
  });
});
