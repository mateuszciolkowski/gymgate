import { describe, it, expect, vi, beforeEach } from "vitest";
import { PlanService } from "./plan.service.js";

vi.mock("./plan.repository.js", () => {
  return {
    PlanRepository: vi.fn(function () {
      return {
        findAll: vi.fn(),
        findById: vi.fn(),
        create: vi.fn(),
        update: vi.fn(),
        delete: vi.fn(),
        findExercisesByIds: vi.fn(),
        findByCreatorAndName: vi.fn(),
        addFavorite: vi.fn(),
        removeFavorite: vi.fn(),
      };
    }),
  };
});

const exerciseStub = (
  id: string,
  creatorUserId: string | null = "1",
  name = `ex-${id}`,
) => ({ id, name, creatorUserId });

describe("PlanService", () => {
  let service: PlanService;
  let mockRepo: any;

  beforeEach(() => {
    vi.clearAllMocks();
    service = new PlanService();
    mockRepo = (service as any).repository;
  });

  describe("createPlan", () => {
    it("creates plan when exercises exist and name is free", async () => {
      const exerciseIds = ["e1", "e2"];
      mockRepo.findExercisesByIds.mockResolvedValue([
        exerciseStub("e1"),
        exerciseStub("e2"),
      ]);
      mockRepo.findByCreatorAndName.mockResolvedValue(null);
      mockRepo.create.mockResolvedValue({ id: "p1" });

      const result = await service.createPlan(
        { name: "My plan", exerciseIds, isPublic: false },
        "user-1",
      );

      expect(mockRepo.create).toHaveBeenCalledWith({
        name: "My plan",
        creatorUserId: "user-1",
        isPublic: false,
        exerciseIds,
      });
      expect(result).toEqual({ id: "p1" });
    });

    it("rejects when some exercises do not exist", async () => {
      mockRepo.findExercisesByIds.mockResolvedValue([exerciseStub("e1")]);

      await expect(
        service.createPlan(
          { name: "X", exerciseIds: ["e1", "e2"], isPublic: false },
          "user-1",
        ),
      ).rejects.toThrow(/Exercises not found.*e2/);
    });

    it("rejects when isPublic=true and any exercise is private", async () => {
      const exerciseIds = ["e1", "e2"];
      mockRepo.findExercisesByIds.mockResolvedValue([
        exerciseStub("e1", "1", "global ok"),
        exerciseStub("e2", "user-X", "private one"),
      ]);
      mockRepo.findByCreatorAndName.mockResolvedValue(null);

      await expect(
        service.createPlan(
          { name: "Public", exerciseIds, isPublic: true },
          "user-1",
        ),
      ).rejects.toThrow(/private exercises.*private one/);
    });

    it("allows isPublic=true with built-in user (id=1) and null creator exercises", async () => {
      const exerciseIds = ["e1", "e2"];
      mockRepo.findExercisesByIds.mockResolvedValue([
        exerciseStub("e1", null),
        exerciseStub("e2", "1"),
      ]);
      mockRepo.findByCreatorAndName.mockResolvedValue(null);
      mockRepo.create.mockResolvedValue({ id: "p1" });

      await service.createPlan(
        { name: "Public", exerciseIds, isPublic: true },
        "user-1",
      );

      expect(mockRepo.create).toHaveBeenCalled();
    });

    it("rejects duplicate plan name per user", async () => {
      mockRepo.findExercisesByIds.mockResolvedValue([exerciseStub("e1")]);
      mockRepo.findByCreatorAndName.mockResolvedValue({ id: "existing" });

      await expect(
        service.createPlan(
          { name: "Dup", exerciseIds: ["e1"], isPublic: false },
          "user-1",
        ),
      ).rejects.toThrow("Plan with this name already exists");
    });
  });

  describe("updatePlan", () => {
    it("rejects when caller is not the owner", async () => {
      mockRepo.findById.mockResolvedValue({
        id: "p1",
        creatorUserId: "owner",
        isPublic: false,
        items: [{ exerciseId: "e1", orderInPlan: 0 }],
      });

      await expect(
        service.updatePlan("p1", { name: "x" }, "intruder"),
      ).rejects.toThrow(/own/);
    });

    it("empty body does not fetch exercises or change items", async () => {
      mockRepo.findById.mockResolvedValue({
        id: "p1",
        creatorUserId: "owner",
        isPublic: false,
        name: "My Plan",
        items: [{ exerciseId: "e1", orderInPlan: 0 }],
      });
      mockRepo.update.mockResolvedValue({ id: "p1" });

      await service.updatePlan("p1", {}, "owner");

      expect(mockRepo.findExercisesByIds).not.toHaveBeenCalled();
      expect(mockRepo.update).toHaveBeenCalledWith("p1", {}, "owner");
    });

    it("rejects switching to public when current items are private", async () => {
      mockRepo.findById.mockResolvedValue({
        id: "p1",
        creatorUserId: "owner",
        isPublic: false,
        name: "p",
        items: [{ exerciseId: "e1", orderInPlan: 0 }],
      });
      mockRepo.findExercisesByIds.mockResolvedValue([
        exerciseStub("e1", "owner", "private"),
      ]);

      await expect(
        service.updatePlan("p1", { isPublic: true }, "owner"),
      ).rejects.toThrow(/private exercises/);
    });
  });

  describe("deletePlan", () => {
    it("rejects when caller is not the owner", async () => {
      mockRepo.findById.mockResolvedValue({
        id: "p1",
        creatorUserId: "owner",
        items: [],
      });

      await expect(service.deletePlan("p1", "intruder")).rejects.toThrow(
        /own/,
      );
    });

    it("deletes when caller owns plan", async () => {
      mockRepo.findById.mockResolvedValue({
        id: "p1",
        creatorUserId: "owner",
        items: [],
      });
      mockRepo.delete.mockResolvedValue({});

      await service.deletePlan("p1", "owner");

      expect(mockRepo.delete).toHaveBeenCalledWith("p1");
    });
  });

  describe("duplicatePlan", () => {
    it("creates a private copy with the same items in order", async () => {
      mockRepo.findById.mockResolvedValue({
        id: "p1",
        creatorUserId: null,
        isPublic: true,
        name: "FBW",
        items: [
          { exerciseId: "e2", orderInPlan: 1 },
          { exerciseId: "e1", orderInPlan: 0 },
        ],
      });
      mockRepo.findByCreatorAndName.mockResolvedValue(null);
      mockRepo.create.mockResolvedValue({ id: "copy" });

      await service.duplicatePlan("p1", "user-1");

      expect(mockRepo.create).toHaveBeenCalledWith({
        name: "FBW (kopia)",
        creatorUserId: "user-1",
        isPublic: false,
        exerciseIds: ["e1", "e2"],
      });
    });

    it("rejects when source plan is not visible", async () => {
      mockRepo.findById.mockResolvedValue({
        id: "p1",
        creatorUserId: "someone-else",
        isPublic: false,
        items: [],
      });

      await expect(service.duplicatePlan("p1", "user-1")).rejects.toThrow(
        "Plan not found",
      );
    });
  });

  describe("getPlanById", () => {
    it("returns plan when caller is owner", async () => {
      const plan = {
        id: "p1",
        creatorUserId: "user-1",
        isPublic: false,
        items: [],
      };
      mockRepo.findById.mockResolvedValue(plan);

      expect(await service.getPlanById("p1", "user-1")).toEqual(plan);
    });

    it("returns plan when plan is built-in", async () => {
      mockRepo.findById.mockResolvedValue({
        id: "p1",
        creatorUserId: null,
        isPublic: true,
        items: [],
      });

      const result = await service.getPlanById("p1", "user-1");
      expect(result.id).toBe("p1");
    });

    it("returns plan when it is public and from another user", async () => {
      mockRepo.findById.mockResolvedValue({
        id: "p1",
        creatorUserId: "other",
        isPublic: true,
        items: [],
      });

      const result = await service.getPlanById("p1", "user-1");
      expect(result.id).toBe("p1");
    });

    it("hides plan from non-owner when not public", async () => {
      mockRepo.findById.mockResolvedValue({
        id: "p1",
        creatorUserId: "other",
        isPublic: false,
        items: [],
      });

      await expect(service.getPlanById("p1", "user-1")).rejects.toThrow(
        "Plan not found",
      );
    });
  });

  describe("favoritePlan", () => {
    it("adds favorite for own plan", async () => {
      mockRepo.findById.mockResolvedValue({ id: "p1", creatorUserId: "user-1", isPublic: false, items: [] });
      await service.favoritePlan("p1", "user-1");
      expect(mockRepo.addFavorite).toHaveBeenCalledWith("user-1", "p1");
    });

    it("adds favorite for built-in plan (creatorUserId null)", async () => {
      mockRepo.findById.mockResolvedValue({ id: "p2", creatorUserId: null, isPublic: false, items: [] });
      await service.favoritePlan("p2", "user-99");
      expect(mockRepo.addFavorite).toHaveBeenCalledWith("user-99", "p2");
    });

    it("adds favorite for visible public plan of another user", async () => {
      mockRepo.findById.mockResolvedValue({ id: "p3", creatorUserId: "user-2", isPublic: true, items: [] });
      await service.favoritePlan("p3", "user-1");
      expect(mockRepo.addFavorite).toHaveBeenCalledWith("user-1", "p3");
    });

    it("throws NotFoundError when plan does not exist", async () => {
      mockRepo.findById.mockResolvedValue(null);
      await expect(service.favoritePlan("no-plan", "user-1")).rejects.toThrow("Plan not found");
    });

    it("throws NotFoundError for private plan of another user", async () => {
      mockRepo.findById.mockResolvedValue({ id: "p4", creatorUserId: "user-2", isPublic: false, items: [] });
      await expect(service.favoritePlan("p4", "user-1")).rejects.toThrow("Plan not found");
    });
  });

  describe("unfavoritePlan", () => {
    it("removes favorite when plan exists", async () => {
      mockRepo.findById.mockResolvedValue({ id: "p1", creatorUserId: "user-1", isPublic: false, items: [] });
      await service.unfavoritePlan("p1", "user-1");
      expect(mockRepo.removeFavorite).toHaveBeenCalledWith("user-1", "p1");
    });

    it("throws NotFoundError when plan does not exist", async () => {
      mockRepo.findById.mockResolvedValue(null);
      await expect(service.unfavoritePlan("no-plan", "user-1")).rejects.toThrow("Plan not found");
    });
  });
});
