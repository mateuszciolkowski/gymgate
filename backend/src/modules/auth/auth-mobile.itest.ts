import { createHash } from "node:crypto";
import jwt from "jsonwebtoken";
import request from "supertest";
import { beforeEach, describe, expect, it } from "vitest";
import { createApp } from "../../app.js";
import { createTestUser, prisma, resetDb, TEST_PASSWORD } from "../../test/db.js";

/** Legacy PWA auth endpoints must stay unchanged; mobile sessions live under /api/auth/mobile/*. */

const app = createApp();
const post = (url: string, body: object) => request(app).post(url).send(body);
const sha = (t: string) => createHash("sha256").update(t).digest("hex");

const registration = (n = 1) => ({
  email: `mobile${n}-${Date.now()}@test.local`,
  password: "secret12",
  firstName: "Jan",
  lastName: "Kowalski",
  phone: "123456789",
});

const login = async (email: string, deviceId = "dev-1") => {
  const res = await post("/api/auth/mobile/login", { email, password: TEST_PASSWORD, deviceId, deviceName: "iPhone" });
  expect(res.status).toBe(200);
  return res.body.data as { user: { id: string }; accessToken: string; refreshToken: string; refreshTokenExpiresAt: string; accessTokenExpiresIn: number };
};
const refresh = (refreshToken: string) => post("/api/auth/mobile/refresh", { refreshToken });
const DAY = 24 * 60 * 60 * 1000;

describe("auth: legacy endpoints (PWA)", () => {
  beforeEach(resetDb);

  it("register / login zwracają dokładnie { user, token } z JWT na 7 dni", async () => {
    const body = registration();
    const reg = await post("/api/auth/register", body);
    expect(reg.status).toBe(201);
    expect(Object.keys(reg.body.data).sort()).toEqual(["token", "user"]);
    expect(reg.body.data.user).not.toHaveProperty("password");
    const decoded = jwt.decode(reg.body.data.token) as { exp: number; iat: number; userId: string; email: string; isAdmin: boolean };
    expect(decoded.exp - decoded.iat).toBe(7 * 24 * 3600);
    expect(Object.keys(decoded).sort()).toEqual(["email", "exp", "iat", "isAdmin", "userId"]);

    const log = await post("/api/auth/login", { email: body.email, password: body.password });
    expect(log.status).toBe(200);
    expect(Object.keys(log.body.data).sort()).toEqual(["token", "user"]);
    expect((await request(app).get("/api/auth/me").set("Authorization", `Bearer ${log.body.data.token}`)).status).toBe(200);
    expect(await prisma.refreshToken.count()).toBe(0); // legacy endpoints never create refresh tokens
  });
});

describe("auth: mobile sessions", () => {
  let user: Awaited<ReturnType<typeof createTestUser>>;

  beforeEach(async () => {
    await resetDb();
    user = await createTestUser();
  });

  describe("register / login", () => {
    it("register: 201, użytkownik bez hasła, token dostępu na 1 h działa w authMiddleware, token odświeżania na 180 dni zapisany jako skrót", async () => {
      const body = registration();
      const res = await post("/api/auth/mobile/register", { ...body, deviceId: "dev-9", deviceName: "Xiaomi" });
      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      const d = res.body.data;
      expect(Object.keys(d).sort()).toEqual(["accessToken", "accessTokenExpiresIn", "refreshToken", "refreshTokenExpiresAt", "user"]);
      expect(d.user).toMatchObject({ email: body.email, firstName: "Jan", isAdmin: false });
      expect(d.user).not.toHaveProperty("password");
      expect(d.accessTokenExpiresIn).toBe(3600);

      const decoded = jwt.decode(d.accessToken) as { exp: number; iat: number; userId: string };
      expect(decoded.exp - decoded.iat).toBe(3600);
      expect(decoded.userId).toBe(d.user.id);
      const me = await request(app).get("/api/auth/me").set("Authorization", `Bearer ${d.accessToken}`);
      expect(me.status).toBe(200);
      expect(me.body.data.email).toBe(body.email);

      const rows = await prisma.refreshToken.findMany();
      expect(rows).toHaveLength(1);
      expect(rows[0]!.tokenHash).toBe(sha(d.refreshToken));
      expect(rows[0]!.tokenHash).not.toBe(d.refreshToken);
      expect(rows[0]).toMatchObject({ userId: d.user.id, deviceId: "dev-9", deviceName: "Xiaomi", revokedAt: null, lastUsedAt: null });
      expect(Math.abs(rows[0]!.expiresAt.getTime() - (Date.now() + 180 * DAY))).toBeLessThan(60_000);
      expect(JSON.stringify(rows)).not.toContain(d.refreshToken);
    });

    it("register: te same komunikaty walidacji i konfliktu co /api/auth/register", async () => {
      const bad = { email: "nie-email", password: "1", firstName: "J", lastName: "K" };
      const legacy = await post("/api/auth/register", bad);
      const mobile = await post("/api/auth/mobile/register", bad);
      expect(mobile.status).toBe(400);
      expect(mobile.body).toEqual(legacy.body);

      const body = registration(2);
      expect((await post("/api/auth/mobile/register", body)).status).toBe(201);
      const dupLegacy = await post("/api/auth/register", body);
      const dupMobile = await post("/api/auth/mobile/register", body);
      expect(dupMobile.status).toBe(409);
      expect(dupMobile.body).toEqual(dupLegacy.body);
      expect(dupMobile.body.error).toBe("Użytkownik z tym emailem już istnieje");
    });

    it("login: złe hasło i nieznany e-mail dają 401 z komunikatem jak w PWA; walidacja jak w PWA", async () => {
      for (const payload of [{ email: user.email, password: "zle" }, { email: "nikt@test.local", password: "x" }]) {
        const legacy = await post("/api/auth/login", payload);
        const mobile = await post("/api/auth/mobile/login", payload);
        expect(mobile.status).toBe(401);
        expect(mobile.body).toEqual(legacy.body);
        expect(mobile.body.error).toBe("Nieprawidłowy email lub hasło");
      }
      const bad = { email: "x", password: "" };
      const legacy = await post("/api/auth/login", bad);
      const mobile = await post("/api/auth/mobile/login", bad);
      expect(mobile.status).toBe(400);
      expect(mobile.body).toEqual(legacy.body);
      expect(await prisma.refreshToken.count()).toBe(0);
    });

    it("login: każde logowanie to nowa rodzina; deviceId domyślnie 'unknown'", async () => {
      const a = await post("/api/auth/mobile/login", { email: user.email, password: TEST_PASSWORD });
      const b = await login(user.email);
      expect(a.status).toBe(200);
      const rows = await prisma.refreshToken.findMany();
      expect(new Set(rows.map((r) => r.familyId)).size).toBe(2);
      expect(rows.map((r) => r.deviceId).sort()).toEqual(["dev-1", "unknown"]);
      expect(b.refreshToken).not.toBe(a.body.data.refreshToken);
    });

    it("konto z tokenami mobilnymi nadal loguje się starym endpointem", async () => {
      await login(user.email);
      const legacy = await post("/api/auth/login", { email: user.email, password: TEST_PASSWORD });
      expect(legacy.status).toBe(200);
    });
  });

  describe("refresh", () => {
    it("wydaje nowy token dostępu i nowy token odświeżania (rotacja), 400 bez tokenu, 401 dla nieznanego", async () => {
      const s = await login(user.email);
      const res = await refresh(s.refreshToken);
      expect(res.status).toBe(200);
      const d = res.body.data;
      expect(d.refreshToken).not.toBe(s.refreshToken);
      expect(d.user).toMatchObject({ id: user.id });
      expect(d.user).not.toHaveProperty("password");
      expect((await request(app).get("/api/auth/me").set("Authorization", `Bearer ${d.accessToken}`)).status).toBe(200);

      expect((await post("/api/auth/mobile/refresh", {})).status).toBe(400);
      const unknown = await refresh("nieistniejacy-token");
      expect(unknown.status).toBe(401);
      expect(unknown.body).toEqual({ success: false, error: "Nieprawidłowy lub wygasły token odświeżania" });
    });

    it("przesuwa okno: nowy token żyje 180 dni od użycia", async () => {
      const s = await login(user.email);
      await prisma.refreshToken.updateMany({ data: { expiresAt: new Date(Date.now() + 2 * DAY) } });
      const res = await refresh(s.refreshToken);
      expect(res.status).toBe(200);
      expect(Math.abs(new Date(res.body.data.refreshTokenExpiresAt).getTime() - (Date.now() + 180 * DAY))).toBeLessThan(60_000);
    });

    it("zgubiona odpowiedź: poprzedni token działa, dopóki nowy nie zostanie użyty", async () => {
      const s = await login(user.email);
      const first = await refresh(s.refreshToken); // response "lost": the client still holds s.refreshToken
      expect(first.status).toBe(200);
      const retry = await refresh(s.refreshToken); // retried with the old token
      expect(retry.status).toBe(200);
      expect(retry.body.data.refreshToken).not.toBe(first.body.data.refreshToken);

      // The retried token continues the session normally.
      const next = await refresh(retry.body.data.refreshToken);
      expect(next.status).toBe(200);
    });

    it("równoległe odświeżenie tym samym tokenem kończy się sukcesem obu żądań", async () => {
      const s = await login(user.email);
      const [a, b] = await Promise.all([refresh(s.refreshToken), refresh(s.refreshToken)]);
      expect([a.status, b.status]).toEqual([200, 200]);
    });

    it("użycie tokenu starszego niż poprzedni unieważnia całą rodzinę", async () => {
      const t0 = await login(user.email);
      const t1 = (await refresh(t0.refreshToken)).body.data;
      const t2 = (await refresh(t1.refreshToken)).body.data; // t1 used: t0 is now two generations old

      const reuse = await refresh(t0.refreshToken);
      expect(reuse.status).toBe(401);
      // Everything of that login is dead, including the newest token.
      expect((await refresh(t2.refreshToken)).status).toBe(401);
      expect((await refresh(t1.refreshToken)).status).toBe(401);
      expect(await prisma.refreshToken.count({ where: { revokedAt: null } })).toBe(0);
    });

    it("ponowne użycie tokenu po tym, jak następca został użyty, też unieważnia rodzinę", async () => {
      const t0 = await login(user.email);
      const t1 = (await refresh(t0.refreshToken)).body.data;
      expect((await refresh(t1.refreshToken)).status).toBe(200); // successor of t0 used
      expect((await refresh(t0.refreshToken)).status).toBe(401);
    });

    it("unieważnienie rodziny nie dotyka innego urządzenia tego samego konta", async () => {
      const phone = await login(user.email, "phone");
      const tablet = await login(user.email, "tablet");
      const p1 = (await refresh(phone.refreshToken)).body.data;
      await refresh(p1.refreshToken);
      expect((await refresh(phone.refreshToken)).status).toBe(401); // theft signal on the phone family
      expect((await refresh(tablet.refreshToken)).status).toBe(200);
    });

    it("401 dla wygasłego tokenu i dla usuniętego użytkownika", async () => {
      const s = await login(user.email);
      await prisma.refreshToken.updateMany({ data: { expiresAt: new Date(Date.now() - 1000) } });
      expect((await refresh(s.refreshToken)).status).toBe(401);

      const other = await createTestUser();
      const o = await login(other.email);
      await prisma.user.delete({ where: { id: other.id } });
      expect((await refresh(o.refreshToken)).status).toBe(401);
    });
  });

  describe("logout", () => {
    it("unieważnia rodzinę (także poprzedni token) i jest idempotentne", async () => {
      const s = await login(user.email);
      const next = (await refresh(s.refreshToken)).body.data;

      const out = await post("/api/auth/mobile/logout", { refreshToken: next.refreshToken });
      expect(out.status).toBe(200);
      expect(out.body.success).toBe(true);
      expect((await refresh(next.refreshToken)).status).toBe(401);
      expect((await refresh(s.refreshToken)).status).toBe(401);

      expect((await post("/api/auth/mobile/logout", { refreshToken: next.refreshToken })).status).toBe(200);
      expect((await post("/api/auth/mobile/logout", { refreshToken: "nieznany" })).status).toBe(200);
      expect((await post("/api/auth/mobile/logout", {})).status).toBe(400);
    });

    it("nie wylogowuje innego urządzenia", async () => {
      const a = await login(user.email, "a");
      const b = await login(user.email, "b");
      await post("/api/auth/mobile/logout", { refreshToken: a.refreshToken });
      expect((await refresh(b.refreshToken)).status).toBe(200);
    });
  });
});
