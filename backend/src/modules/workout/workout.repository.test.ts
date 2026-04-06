import { beforeEach, describe, expect, it, vi } from "vitest";

const {
  workoutSetDeleteManyMock,
  workoutItemDeleteManyMock,
  workoutDeleteMock,
  transactionMock,
} = vi.hoisted(() => ({
  workoutSetDeleteManyMock: vi.fn(),
  workoutItemDeleteManyMock: vi.fn(),
  workoutDeleteMock: vi.fn(),
  transactionMock: vi.fn(),
}));

vi.mock("../../config/database.js", () => ({
  default: {
    $transaction: transactionMock,
  },
}));

import * as workoutRepository from "./workout.repository.js";

describe("workout.repository", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("deleteWorkout: removes workout sets, workout items and workout in one transaction", async () => {
    workoutSetDeleteManyMock.mockResolvedValue({ count: 3 });
    workoutItemDeleteManyMock.mockResolvedValue({ count: 2 });
    workoutDeleteMock.mockResolvedValue({ id: "w1" });

    transactionMock.mockImplementation(async (callback: (tx: unknown) => unknown) =>
      callback({
        workoutSet: { deleteMany: workoutSetDeleteManyMock },
        workoutItem: { deleteMany: workoutItemDeleteManyMock },
        workout: { delete: workoutDeleteMock },
      }),
    );

    const result = await workoutRepository.deleteWorkout("w1");

    expect(transactionMock).toHaveBeenCalledTimes(1);
    expect(workoutSetDeleteManyMock).toHaveBeenCalledWith({
      where: { item: { workoutId: "w1" } },
    });
    expect(workoutItemDeleteManyMock).toHaveBeenCalledWith({
      where: { workoutId: "w1" },
    });
    expect(workoutDeleteMock).toHaveBeenCalledWith({ where: { id: "w1" } });

    const setsCallOrder = workoutSetDeleteManyMock.mock.invocationCallOrder[0];
    const itemsCallOrder = workoutItemDeleteManyMock.mock.invocationCallOrder[0];
    const workoutCallOrder = workoutDeleteMock.mock.invocationCallOrder[0];

    expect(setsCallOrder).toBeLessThan(itemsCallOrder);
    expect(itemsCallOrder).toBeLessThan(workoutCallOrder);
    expect(result).toEqual({ id: "w1" });
  });
});
