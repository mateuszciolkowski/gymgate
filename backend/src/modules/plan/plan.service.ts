import { PlanRepository } from "./plan.repository.js";
import type { CreatePlanDto, UpdatePlanDto, PlanTab } from "./plan.schema.js";
import {
  BadRequestError,
  ConflictError,
  ForbiddenError,
  NotFoundError,
} from "../../common/errors.js";
import { isGlobalCreatorId } from "../../config/constants.js";

const MAX_COPY_SUFFIX = 999;

export class PlanService {
  private repository: PlanRepository;

  constructor() {
    this.repository = new PlanRepository();
  }

  async getAllPlans(tab: PlanTab, userId: string) {
    return this.repository.findAll(tab, userId);
  }

  async getPlanById(id: string, userId: string) {
    const plan = await this.repository.findById(id);

    if (!plan) {
      throw new NotFoundError("Plan not found");
    }

    const isOwner = plan.creatorUserId === userId;
    const isBuiltIn = plan.creatorUserId === null;
    const isVisiblePublic = plan.isPublic && plan.creatorUserId !== null;

    if (!isOwner && !isBuiltIn && !isVisiblePublic) {
      throw new NotFoundError("Plan not found");
    }

    return plan;
  }

  async createPlan(data: CreatePlanDto, userId: string) {
    await this.assertExercisesExistAndPublic(data.exerciseIds, data.isPublic);
    await this.assertNameAvailable(userId, data.name);

    return this.runCreateWithUniqueGuard(() =>
      this.repository.create({
        name: data.name,
        creatorUserId: userId,
        isPublic: data.isPublic,
        exerciseIds: data.exerciseIds,
      }),
    );
  }

  async updatePlan(id: string, data: UpdatePlanDto, userId: string) {
    const plan = await this.repository.findById(id);

    if (!plan) {
      throw new NotFoundError("Plan not found");
    }

    if (plan.creatorUserId !== userId) {
      throw new ForbiddenError("You can only edit your own plans");
    }

    const nextIsPublic = data.isPublic ?? plan.isPublic;

    if (data.exerciseIds) {
      await this.assertExercisesExistAndPublic(data.exerciseIds, nextIsPublic);
    } else if (nextIsPublic) {
      await this.assertExercisesArePublic(plan.items.map((i) => i.exerciseId));
    }

    if (data.name && data.name !== plan.name) {
      await this.assertNameAvailable(userId, data.name);
    }

    return this.runCreateWithUniqueGuard(() => this.repository.update(id, data));
  }

  async deletePlan(id: string, userId: string) {
    const plan = await this.repository.findById(id);

    if (!plan) {
      throw new NotFoundError("Plan not found");
    }

    if (plan.creatorUserId !== userId) {
      throw new ForbiddenError("You can only delete your own plans");
    }

    await this.repository.delete(id);
  }

  async duplicatePlan(id: string, userId: string) {
    const source = await this.getPlanById(id, userId);

    const baseName = source.name;
    const name = await this.findFreeCopyName(userId, baseName);

    return this.runCreateWithUniqueGuard(() =>
      this.repository.create({
        name,
        creatorUserId: userId,
        isPublic: false,
        exerciseIds: source.items
          .sort((a, b) => a.orderInPlan - b.orderInPlan)
          .map((i) => i.exerciseId),
      }),
    );
  }

  private async assertExercisesExistAndPublic(exerciseIds: string[], requirePublic: boolean) {
    const exercises = await this.repository.findExercisesByIds(exerciseIds);
    if (exercises.length !== exerciseIds.length) {
      const found = new Set(exercises.map((e) => e.id));
      const missing = exerciseIds.filter((id) => !found.has(id));
      throw new BadRequestError(`Exercises not found: ${missing.join(", ")}`);
    }
    if (requirePublic) {
      const privateOnes = exercises.filter((e) => !isGlobalCreatorId(e.creatorUserId));
      if (privateOnes.length > 0) {
        throw new BadRequestError(
          `Cannot make plan public: contains private exercises (${privateOnes.map((e) => e.name).join(", ")})`,
        );
      }
    }
  }

  private async assertExercisesArePublic(exerciseIds: string[]) {
    const exercises = await this.repository.findExercisesByIds(exerciseIds);
    const privateOnes = exercises.filter((e) => !isGlobalCreatorId(e.creatorUserId));
    if (privateOnes.length > 0) {
      throw new BadRequestError(
        `Cannot make plan public: contains private exercises (${privateOnes.map((e) => e.name).join(", ")})`,
      );
    }
  }

  private async assertNameAvailable(userId: string, name: string) {
    const existing = await this.repository.findByCreatorAndName(userId, name);
    if (existing) {
      throw new ConflictError("Plan with this name already exists");
    }
  }

  private async findFreeCopyName(userId: string, baseName: string) {
    let candidate = `${baseName} (kopia)`;
    let counter = 2;
    while (await this.repository.findByCreatorAndName(userId, candidate)) {
      if (counter > MAX_COPY_SUFFIX) {
        throw new ConflictError(
          "Cannot generate unique name for plan copy — please rename manually",
        );
      }
      candidate = `${baseName} (kopia ${counter})`;
      counter += 1;
    }
    return candidate;
  }

  // Wąsko-zakresowy guard na race condition między check-name a create.
  // Mapuje Prisma P2002 (unique violation na creatorUserId+name) na 409.
  private async runCreateWithUniqueGuard<T>(op: () => Promise<T>): Promise<T> {
    try {
      return await op();
    } catch (err) {
      if (
        err &&
        typeof err === "object" &&
        "code" in err &&
        (err as { code: string }).code === "P2002"
      ) {
        throw new ConflictError("Plan with this name already exists");
      }
      throw err;
    }
  }
}
