import { beforeEach, describe, expect, it, vi } from "vitest";

type AuthModule = typeof import("./auth.service.js");

const setupAuthModule = async (jwtSecret = "test-secret") => {
  vi.resetModules();
  process.env.JWT_SECRET = jwtSecret;

  const mocks = {
    findUserByEmail: vi.fn(),
    findUserById: vi.fn(),
    createUser: vi.fn(),
    hash: vi.fn(),
    compare: vi.fn(),
    sign: vi.fn(),
    verify: vi.fn(),
  };

  vi.doMock("../user/user.repository.js", () => ({
    findUserByEmail: mocks.findUserByEmail,
    findUserById: mocks.findUserById,
    createUser: mocks.createUser,
  }));

  vi.doMock("bcryptjs", () => ({
    default: {
      hash: mocks.hash,
      compare: mocks.compare,
    },
  }));

  vi.doMock("jsonwebtoken", () => ({
    default: {
      sign: mocks.sign,
      verify: mocks.verify,
    },
  }));

  const auth = (await import("./auth.service.js")) as AuthModule;
  return { auth, mocks };
};

describe("auth.service", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("register: throws when email already exists", async () => {
    const { auth, mocks } = await setupAuthModule();
    mocks.findUserByEmail.mockResolvedValue({ id: "u1", email: "a@a.com" });

    await expect(
      auth.register({
        email: "a@a.com",
        password: "secret123",
        firstName: "Ala",
        lastName: "Nowak",
      }),
    ).rejects.toThrow("Użytkownik z tym emailem już istnieje");
  });

  it("register: hashes password, creates user and returns token without password", async () => {
    const { auth, mocks } = await setupAuthModule();
    mocks.findUserByEmail.mockResolvedValue(null);
    mocks.hash.mockResolvedValue("hashed-password");
    mocks.createUser.mockResolvedValue({
      id: "u1",
      email: "new@example.com",
      password: "hashed-password",
      firstName: "Jan",
      lastName: "Kowalski",
      phone: null,
    });
    mocks.sign.mockReturnValue("jwt-token");

    const result = await auth.register({
      email: "new@example.com",
      password: "secret123",
      firstName: "Jan",
      lastName: "Kowalski",
    });

    expect(mocks.hash).toHaveBeenCalledWith("secret123", 10);
    expect(mocks.createUser).toHaveBeenCalledWith({
      email: "new@example.com",
      password: "hashed-password",
      firstName: "Jan",
      lastName: "Kowalski",
      phone: null,
    });
    expect(mocks.sign).toHaveBeenCalledWith(
      { userId: "u1", email: "new@example.com" },
      "test-secret",
      { expiresIn: "7d" },
    );
    expect(result).toEqual({
      user: {
        id: "u1",
        email: "new@example.com",
        firstName: "Jan",
        lastName: "Kowalski",
        phone: null,
      },
      token: "jwt-token",
    });
  });

  it("login: throws on invalid password", async () => {
    const { auth, mocks } = await setupAuthModule();
    mocks.findUserByEmail.mockResolvedValue({
      id: "u1",
      email: "user@example.com",
      password: "hash",
    });
    mocks.compare.mockResolvedValue(false);

    await expect(
      auth.login({ email: "user@example.com", password: "bad" }),
    ).rejects.toThrow("Nieprawidłowy email lub hasło");
  });

  it("login: returns user without password and jwt token", async () => {
    const { auth, mocks } = await setupAuthModule();
    mocks.findUserByEmail.mockResolvedValue({
      id: "u1",
      email: "user@example.com",
      password: "hash",
      firstName: "Jan",
      lastName: "Kowalski",
    });
    mocks.compare.mockResolvedValue(true);
    mocks.sign.mockReturnValue("login-token");

    const result = await auth.login({
      email: "user@example.com",
      password: "good",
    });

    expect(mocks.compare).toHaveBeenCalledWith("good", "hash");
    expect(result).toEqual({
      user: {
        id: "u1",
        email: "user@example.com",
        firstName: "Jan",
        lastName: "Kowalski",
      },
      token: "login-token",
    });
  });

  it("verifyToken: throws normalized error when jwt verification fails", async () => {
    const { auth, mocks } = await setupAuthModule();
    mocks.verify.mockImplementation(() => {
      throw new Error("invalid token");
    });

    expect(() => auth.verifyToken("bad-token")).toThrow(
      "Nieprawidłowy lub wygasły token",
    );
  });

  it("getUserFromToken: loads user and removes password", async () => {
    const { auth, mocks } = await setupAuthModule();
    mocks.verify.mockReturnValue({ userId: "u1", email: "user@example.com" });
    mocks.findUserById.mockResolvedValue({
      id: "u1",
      email: "user@example.com",
      password: "hash",
      firstName: "Jan",
    });

    const user = await auth.getUserFromToken("valid-token");

    expect(mocks.findUserById).toHaveBeenCalledWith("u1");
    expect(user).toEqual({
      id: "u1",
      email: "user@example.com",
      firstName: "Jan",
    });
  });
});
