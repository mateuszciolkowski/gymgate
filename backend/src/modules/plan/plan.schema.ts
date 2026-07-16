import { z } from "zod";

export const planTabSchema = z.enum(["mine", "builtin", "community"]);

export const createPlanSchema = z.object({
  body: z.object({
    name: z
      .string()
      .min(3, "Name must be at least 3 characters")
      .max(100, "Name must be at most 100 characters"),
    shortName: z.string().max(50).nullable().optional(),
    exerciseIds: z
      .array(z.string().uuid())
      .min(1, "At least one exercise is required")
      .max(50, "At most 50 exercises are allowed")
      .refine(
        (ids) => new Set(ids).size === ids.length,
        "Exercise IDs must be unique",
      ),
    isPublic: z.boolean().default(false),
  }),
});

export const updatePlanSchema = z.object({
  params: z.object({
    id: z.string().uuid(),
  }),
  body: z.object({
    name: z.string().min(3).max(100).optional(),
    shortName: z.string().max(50).nullable().optional(),
    exerciseIds: z
      .array(z.string().uuid())
      .min(1)
      .max(50)
      .refine((ids) => new Set(ids).size === ids.length, "Exercise IDs must be unique")
      .optional(),
    isPublic: z.boolean().optional(),
  }),
});

export const getPlanSchema = z.object({
  params: z.object({
    id: z.string().uuid(),
  }),
});

export const listPlansSchema = z.object({
  query: z.object({
    tab: planTabSchema.default("mine"),
  }),
});

export type PlanTab = z.infer<typeof planTabSchema>;
export type CreatePlanDto = z.infer<typeof createPlanSchema>["body"];
export type UpdatePlanDto = z.infer<typeof updatePlanSchema>["body"];
