import { PlanRepository } from "./plan.repository.js";
import type { CreatePlanDto, UpdatePlanDto, PlanTab } from "./plan.schema.js";
import {
  BadRequestError,
  ConflictError,
  ForbiddenError,
  NotFoundError,
} from "../../common/errors.js";
import { isGlobalCreatorId } from "../../config/constants.js";
import { toSnapshot } from "./plan.history.js";
import type { WriteStamp } from "../workout/workout.repository.js";

const MAX_COPY_SUFFIX = 999;

// Author edits own plans; admin also edits built-in (creatorUserId = null) ones.
export function canModify(plan: { creatorUserId: string | null }, userId: string, isAdmin: boolean) {
  return plan.creatorUserId === userId || (isAdmin && plan.creatorUserId === null);
}

export class PlanService {
  private repository: PlanRepository;

  constructor() {
    this.repository = new PlanRepository();
  }

  async getAllPlans(tab: PlanTab, userId: string) {
    return this.repository.findAll(tab, userId);
  }

  async getPlanById(id: string, userId: string) {
    const plan = await this.repository.findById(id, userId);

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

  async createPlan(
    data: CreatePlanDto & { isGlobal?: boolean },
    userId: string,
    isAdmin = false,
    stamp?: WriteStamp,
  ) {
    if (data.isGlobal && !isAdmin) {
      throw new ForbiddenError("Only admins can create global plans");
    }

    const creatorUserId = data.isGlobal && isAdmin ? null : userId;
    const isPublic = data.isGlobal ? true : data.isPublic;

    await this.assertExercisesExistAndPublic(data.exerciseIds, isPublic);
    await this.assertNameAvailable(creatorUserId, data.name);

    const input = {
      name: data.name,
      shortName: data.shortName,
      creatorUserId,
      isPublic,
      exerciseIds: data.exerciseIds,
    };
    return this.runCreateWithUniqueGuard(() =>
      stamp ? this.repository.create(input, stamp) : this.repository.create(input),
    );
  }

  async updatePlan(
    id: string,
    data: UpdatePlanDto & { isGlobal?: boolean },
    userId: string,
    isAdmin = false,
    stamp?: Pick<WriteStamp, "updatedAt">,
  ) {
    const plan = await this.repository.findById(id);

    if (!plan) {
      throw new NotFoundError("Plan not found");
    }

    if (!canModify(plan, userId, isAdmin)) {
      throw new ForbiddenError("You can only edit your own plans");
    }

    const nextCreatorUserId =
      data.isGlobal !== undefined
        ? data.isGlobal && isAdmin
          ? null
          : userId
        : plan.creatorUserId;

    const nextIsPublic = data.isGlobal ? true : (data.isPublic ?? plan.isPublic);

    if (data.exerciseIds) {
      await this.assertExercisesExistAndPublic(data.exerciseIds, nextIsPublic);
    } else if (nextIsPublic) {
      await this.assertExercisesArePublic(plan.items.map((i) => i.exerciseId));
    }

    if (data.name && data.name !== plan.name) {
      await this.assertNameAvailable(nextCreatorUserId, data.name);
    }

    const updateData: Parameters<PlanRepository["update"]>[1] = {};
    if (data.name !== undefined) updateData.name = data.name;
    if (data.shortName !== undefined) updateData.shortName = data.shortName;
    if (data.exerciseIds !== undefined) updateData.exerciseIds = data.exerciseIds;
    if (data.isPublic !== undefined) updateData.isPublic = data.isPublic;
    if (data.isGlobal !== undefined) {
      updateData.creatorUserId = data.isGlobal && isAdmin ? null : userId;
      updateData.isPublic = true;
    }

    return this.runCreateWithUniqueGuard(() =>
      stamp
        ? this.repository.update(id, updateData, userId, stamp)
        : this.repository.update(id, updateData, userId),
    );
  }

  async deletePlan(id: string, userId: string, isAdmin = false) {
    const plan = await this.repository.findById(id);

    if (!plan) {
      throw new NotFoundError("Plan not found");
    }

    if (!canModify(plan, userId, isAdmin)) {
      throw new ForbiddenError("You can only delete your own plans");
    }

    await this.repository.delete(id);
  }

  /** Versions newest first; visible only to whoever can edit the plan. */
  async getPlanHistory(id: string, userId: string, isAdmin = false) {
    const plan = await this.repository.findById(id);

    if (!plan) {
      throw new NotFoundError("Plan not found");
    }

    if (!canModify(plan, userId, isAdmin)) {
      throw new ForbiddenError("You can only view history of your own plans");
    }

    const versions = await this.repository.findVersions(id);
    // Plan untouched since history was introduced: its current state is v1.
    return versions.length > 0
      ? versions
      : [{ version: 1, ...toSnapshot(plan), createdAt: plan.updatedAt }];
  }

  async duplicatePlan(id: string, userId: string, nameOverride?: string, stamp?: WriteStamp) {
    const source = await this.getPlanById(id, userId);

    // nameOverride: sync passes the copy name computed on the device.
    let name: string;
    if (nameOverride === undefined) {
      name = await this.findFreeCopyName(userId, source.name);
    } else {
      await this.assertNameAvailable(userId, nameOverride);
      name = nameOverride;
    }

    const input = {
      name,
      creatorUserId: userId,
      isPublic: false,
      exerciseIds: source.items
        .sort((a, b) => a.orderInPlan - b.orderInPlan)
        .map((i) => i.exerciseId),
    };
    return this.runCreateWithUniqueGuard(() =>
      stamp ? this.repository.create(input, stamp) : this.repository.create(input),
    );
  }

  async favoritePlan(id: string, userId: string) {
    await this.getPlanById(id, userId);
    await this.repository.addFavorite(userId, id);
  }

  async unfavoritePlan(id: string, userId: string) {
    await this.getPlanById(id, userId);
    await this.repository.removeFavorite(userId, id);
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

  private async assertNameAvailable(creatorUserId: string | null, name: string) {
    const existing = await this.repository.findByCreatorAndName(creatorUserId, name);
    if (existing) {
      throw new ConflictError(
        creatorUserId
          ? "Plan with this name already exists"
          : "Global plan with this name already exists",
      );
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

  // Narrowly scoped guard against a race condition between check-name and create.
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
        // P2002 can also come from (planId, version) when two saves of one plan race.
        const target = JSON.stringify((err as { meta?: { target?: unknown } }).meta?.target ?? "name");
        throw new ConflictError(
          target.includes("version")
            ? "Plan was modified at the same time elsewhere, please retry"
            : "Plan with this name already exists",
        );
      }
      throw err;
    }
  }
}
