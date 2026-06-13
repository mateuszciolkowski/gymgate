import { describe, expect, it } from "vitest";
import { registerSchema, loginSchema } from "./auth.schema.js";

describe("auth.schema", () => {
  describe("registerSchema", () => {
    const valid = {
      body: {
        email: "user@example.com",
        password: "secret123",
        firstName: "Jan",
        lastName: "Kowalski",
      },
    };

    it("akceptuje poprawne dane (phone opcjonalny)", () => {
      expect(registerSchema.safeParse(valid).success).toBe(true);
    });

    it("akceptuje phone gdy podany", () => {
      const res = registerSchema.safeParse({
        body: { ...valid.body, phone: "+48123456789" },
      });
      expect(res.success).toBe(true);
    });

    it("odrzuca nieprawidłowy email", () => {
      const res = registerSchema.safeParse({
        body: { ...valid.body, email: "not-an-email" },
      });
      expect(res.success).toBe(false);
    });

    it("odrzuca zbyt krótkie hasło (<6)", () => {
      const res = registerSchema.safeParse({
        body: { ...valid.body, password: "12345" },
      });
      expect(res.success).toBe(false);
    });

    it("odrzuca zbyt krótkie imię (<2)", () => {
      const res = registerSchema.safeParse({
        body: { ...valid.body, firstName: "J" },
      });
      expect(res.success).toBe(false);
    });

    it("odrzuca brak wymaganych pól", () => {
      const res = registerSchema.safeParse({ body: { email: "user@example.com" } });
      expect(res.success).toBe(false);
    });
  });

  describe("loginSchema", () => {
    it("akceptuje email + niepuste hasło", () => {
      const res = loginSchema.safeParse({
        body: { email: "user@example.com", password: "x" },
      });
      expect(res.success).toBe(true);
    });

    it("odrzuca puste hasło", () => {
      const res = loginSchema.safeParse({
        body: { email: "user@example.com", password: "" },
      });
      expect(res.success).toBe(false);
    });

    it("odrzuca zły email", () => {
      const res = loginSchema.safeParse({
        body: { email: "bad", password: "x" },
      });
      expect(res.success).toBe(false);
    });
  });
});
