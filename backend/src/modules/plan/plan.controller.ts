import type { Response } from "express";
import { PlanService } from "./plan.service.js";
import type { AuthRequest } from "../../common/middleware/auth.js";
import type { PlanTab } from "./plan.schema.js";
import { sendError } from "../../common/errors.js";

export class PlanController {
  private service: PlanService;

  constructor() {
    this.service = new PlanService();

    this.getAll = this.getAll.bind(this);
    this.getById = this.getById.bind(this);
    this.create = this.create.bind(this);
    this.update = this.update.bind(this);
    this.delete = this.delete.bind(this);
    this.duplicate = this.duplicate.bind(this);
  }

  async getAll(req: AuthRequest, res: Response) {
    try {
      const tab = (req.query.tab as PlanTab) || "mine";
      const plans = await this.service.getAllPlans(tab, req.userId!);

      res.json({ success: true, data: plans, count: plans.length });
    } catch (error) {
      sendError(res, error);
    }
  }

  async getById(req: AuthRequest, res: Response) {
    try {
      const { id } = req.params as { id: string };
      const plan = await this.service.getPlanById(id, req.userId!);

      res.json({ success: true, data: plan });
    } catch (error) {
      sendError(res, error);
    }
  }

  async create(req: AuthRequest, res: Response) {
    try {
      const plan = await this.service.createPlan(req.body, req.userId!);

      res.status(201).json({ success: true, data: plan });
    } catch (error) {
      sendError(res, error);
    }
  }

  async update(req: AuthRequest, res: Response) {
    try {
      const { id } = req.params as { id: string };
      const plan = await this.service.updatePlan(id, req.body, req.userId!);

      res.json({ success: true, data: plan });
    } catch (error) {
      sendError(res, error);
    }
  }

  async delete(req: AuthRequest, res: Response) {
    try {
      const { id } = req.params as { id: string };
      await this.service.deletePlan(id, req.userId!);

      res.status(204).send();
    } catch (error) {
      sendError(res, error);
    }
  }

  async duplicate(req: AuthRequest, res: Response) {
    try {
      const { id } = req.params as { id: string };
      const plan = await this.service.duplicatePlan(id, req.userId!);

      res.status(201).json({ success: true, data: plan });
    } catch (error) {
      sendError(res, error);
    }
  }
}
