import { beforeAll, describe, expect, it } from "vitest";
import request from "supertest";
import jwt from "jsonwebtoken";
import type { Express } from "express";

const SECRET = "integration-secret";
const ALLOWED_ORIGIN = "http://localhost:5173";

let app: Express;
let tokenU1: string;

beforeAll(async () => {
  // Set env BEFORE importing app (authMiddleware reads JWT_SECRET at import time).
  process.env.NODE_ENV = "test";
  process.env.JWT_SECRET = SECRET;

  const mod = await import("./app.js");
  app = mod.createApp();
  tokenU1 = jwt.sign({ userId: "u1", email: "u1@example.com" }, SECRET);
});

describe("app integration", () => {
  describe("health", () => {
    it("GET / -> 200 ok", async () => {
      const res = await request(app).get("/");
      expect(res.status).toBe(200);
      expect(res.body).toMatchObject({ status: "ok" });
    });

    it("GET /health -> 200 z timestamp", async () => {
      const res = await request(app).get("/health");
      expect(res.status).toBe(200);
      expect(res.body.status).toBe("ok");
      expect(typeof res.body.timestamp).toBe("string");
    });
  });

  describe("ochrona authMiddleware (401 bez tokenu)", () => {
    const protectedRoutes = [
      "/api/workouts",
      "/api/plans",
      "/api/exercises",
      "/api/users/u1",
      "/api/auth/me",
    ];

    for (const route of protectedRoutes) {
      it(`GET ${route} bez tokenu -> 401`, async () => {
        const res = await request(app).get(route);
        expect(res.status).toBe(401);
        expect(res.body.success).toBe(false);
      });
    }

    it("GET /api/workouts ze złym tokenem -> 401", async () => {
      const res = await request(app)
        .get("/api/workouts")
        .set("Authorization", "Bearer garbage.token.value");
      expect(res.status).toBe(401);
    });
  });

  describe("ownership na /api/users/:id", () => {
    it("zalogowany user proszący o cudze id -> 403 (bez dostępu do danych)", async () => {
      const res = await request(app)
        .get("/api/users/u2")
        .set("Authorization", `Bearer ${tokenU1}`);
      expect(res.status).toBe(403);
      expect(res.body).toEqual({
        success: false,
        error: "Brak uprawnień do danych tego użytkownika",
      });
    });
  });

  describe("walidacja (400)", () => {
    it("POST /api/auth/register z pustym body -> 400", async () => {
      const res = await request(app).post("/api/auth/register").send({});
      expect(res.status).toBe(400);
      expect(res.body.error).toBe("Validation failed");
    });

    it("POST /api/auth/login z błędnym emailem -> 400", async () => {
      const res = await request(app)
        .post("/api/auth/login")
        .send({ email: "bad", password: "x" });
      expect(res.status).toBe(400);
    });
  });

  describe("CORS", () => {
    it("dozwolony origin jest odbijany w nagłówku", async () => {
      const res = await request(app).get("/health").set("Origin", ALLOWED_ORIGIN);
      expect(res.status).toBe(200);
      expect(res.headers["access-control-allow-origin"]).toBe(ALLOWED_ORIGIN);
    });

    it("preflight OPTIONS dla dozwolonego origin -> 204", async () => {
      const res = await request(app)
        .options("/api/auth/login")
        .set("Origin", ALLOWED_ORIGIN)
        .set("Access-Control-Request-Method", "POST");
      expect([200, 204]).toContain(res.status);
      expect(res.headers["access-control-allow-origin"]).toBe(ALLOWED_ORIGIN);
    });
  });

  describe("404 / nieznane trasy", () => {
    it("nieznana trasa zwraca 404", async () => {
      const res = await request(app).get("/api/nope");
      expect(res.status).toBe(404);
    });
  });
});
