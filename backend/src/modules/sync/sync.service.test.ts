import { describe, expect, it } from "vitest";
import express from "express";
import request from "supertest";
import { ZodError } from "zod";
import { BadRequestError, ConflictError, ForbiddenError, NotFoundError } from "../../common/errors.js";
import { createUserRateLimiter } from "../../common/middleware/rateLimit.js";
import { clampAt, isStartTooOld, isSuperseded, toRejection } from "./sync.service.js";
import { operationSchema, pushSchema } from "./sync.schema.js";

const now = new Date("2026-11-15T12:00:00.000Z");
const uuid = "3f2b8c1e-5a4d-4e6f-8a9b-0c1d2e3f4a5b";

describe("sync pure rules", () => {
  it("clampAt cuts future times to server time", () => {
    expect(clampAt(new Date("2026-11-16T00:00:00Z"), now)).toBe(now);
    const past = new Date("2026-11-14T00:00:00Z");
    expect(clampAt(past, now)).toBe(past);
  });

  it("isSuperseded: older loses, equal and newer apply", () => {
    const rec = new Date("2026-11-15T10:00:00Z");
    expect(isSuperseded(new Date("2026-11-15T09:59:59Z"), rec)).toBe(true);
    expect(isSuperseded(rec, rec)).toBe(false);
    expect(isSuperseded(new Date("2026-11-15T10:00:01Z"), rec)).toBe(false);
  });

  it("isStartTooOld: 30 days boundary", () => {
    expect(isStartTooOld(new Date(now.getTime() - 30 * 86_400_000), now)).toBe(false);
    expect(isStartTooOld(new Date(now.getTime() - 30 * 86_400_000 - 1), now)).toBe(true);
  });

  it("toRejection maps service errors and leaves unknown ones to the caller", () => {
    expect(toRejection(new NotFoundError("x"))?.code).toBe("not_found");
    expect(toRejection(new ForbiddenError("x"))?.code).toBe("forbidden");
    expect(toRejection(new BadRequestError("x"))?.code).toBe("bad_request");
    expect(toRejection(new ConflictError("x"))?.code).toBe("conflict");
    expect(toRejection(new Error("boom"))).toBeNull();
    const zod = operationSchema.safeParse({ type: "workout.delete", opId: "a", at: "x", id: "no" });
    expect(zod.success).toBe(false);
    expect(toRejection(zod.error as ZodError)?.code).toBe("validation");
  });
});

describe("sync schemas", () => {
  it("accepts weight as number or decimal string and rejects bad values", () => {
    const base = { opId: "o", type: "set.add", at: now.toISOString(), id: uuid, itemId: uuid, setNumber: 1, repetitions: 5 };
    expect(operationSchema.parse({ ...base, weight: "62.5" })).toMatchObject({ weight: 62.5 });
    expect(operationSchema.safeParse({ ...base, weight: -1 }).success).toBe(false);
    expect(operationSchema.safeParse({ ...base, weight: "abc" }).success).toBe(false);
    expect(operationSchema.safeParse({ ...base, weight: 10000 }).success).toBe(false);
  });

  it("push envelope keeps unknown op fields and limits to 100", () => {
    const op = { opId: "o", type: "x", extra: 1 };
    expect(pushSchema.parse({ body: { deviceId: "d", ops: [op] }, query: {}, params: {} }).body.ops[0]).toMatchObject({ extra: 1 });
    const many = Array.from({ length: 101 }, () => op);
    expect(pushSchema.safeParse({ body: { deviceId: "d", ops: many } }).success).toBe(false);
  });
});

describe("createUserRateLimiter", () => {
  it("limits per user, not per IP", async () => {
    const app = express();
    app.use((req, _res, next) => {
      (req as { userId?: string }).userId = req.header("x-user") ?? "";
      next();
    });
    app.post("/", createUserRateLimiter(2, false), (_req, res) => void res.json({ ok: true }));

    expect((await request(app).post("/").set("x-user", "a")).status).toBe(200);
    expect((await request(app).post("/").set("x-user", "a")).status).toBe(200);
    expect((await request(app).post("/").set("x-user", "a")).status).toBe(429);
    expect((await request(app).post("/").set("x-user", "b")).status).toBe(200);
  });
});
