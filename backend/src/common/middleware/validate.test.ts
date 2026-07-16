import { describe, expect, it, vi } from "vitest";
import { z } from "zod";
import { validate } from "./validate.js";

const schema = z.object({
  body: z.object({
    name: z.string().min(2),
    age: z.number().int().positive(),
  }),
});

const makeRes = () => {
  const res: any = {
    statusCode: 0,
    body: undefined,
    status(code: number) {
      this.statusCode = code;
      return this;
    },
    json(payload: unknown) {
      this.body = payload;
      return this;
    },
  };
  return res;
};

describe("validate middleware", () => {
  it("woła next() gdy dane poprawne", async () => {
    const req: any = { body: { name: "Jan", age: 30 }, query: {}, params: {} };
    const res = makeRes();
    const next = vi.fn();

    await validate(schema)(req, res, next);

    expect(next).toHaveBeenCalledTimes(1);
    expect(res.statusCode).toBe(0);
  });

  it("zwraca 400 z details gdy dane niepoprawne", async () => {
    const req: any = { body: { name: "J", age: -1 }, query: {}, params: {} };
    const res = makeRes();
    const next = vi.fn();

    await validate(schema)(req, res, next);

    expect(next).not.toHaveBeenCalled();
    expect(res.statusCode).toBe(400);
    expect(res.body.success).toBe(false);
    expect(res.body.error).toBe("Validation failed");
    expect(Array.isArray(res.body.details)).toBe(true);
    expect(res.body.details.length).toBeGreaterThan(0);
    expect(res.body.details[0]).toHaveProperty("path");
    expect(res.body.details[0]).toHaveProperty("message");
  });
});
