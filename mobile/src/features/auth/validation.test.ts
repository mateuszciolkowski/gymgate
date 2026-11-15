import { validateLogin, validateRegister } from "./validation";

const valid = { firstName: "Jan", lastName: "Kowalski", email: "jan@x.pl", phone: "", password: "secret1", confirmPassword: "secret1" };

describe("validateLogin", () => {
  it("requires both fields", () => {
    expect(validateLogin({ email: "", password: "" })).toEqual({ email: "Wypełnij to pole", password: "Wypełnij to pole" });
  });
  it("checks email format and password length", () => {
    expect(validateLogin({ email: "nie-email", password: "123" })).toEqual({
      email: "Nieprawidłowy email",
      password: "Hasło musi mieć minimum 6 znaków",
    });
  });
  it("accepts valid input", () => {
    expect(validateLogin({ email: "jan@x.pl", password: "123456" })).toEqual({});
  });
});

describe("validateRegister", () => {
  it("accepts valid input; phone is optional", () => {
    expect(validateRegister(valid)).toEqual({ fields: {} });
  });
  it("reports mismatch as the banner error, in the PWA order, only once fields are valid", () => {
    expect(validateRegister({ ...valid, confirmPassword: "secret2" })).toEqual({ fields: {}, form: "Hasła nie są identyczne" });
    expect(validateRegister({ ...valid, firstName: "", confirmPassword: "secret2" }).form).toBeUndefined();
  });
  it("applies the server rules locally (name >= 2 chars, email, password >= 6)", () => {
    const r = validateRegister({ ...valid, firstName: "J", lastName: "K", email: "x", password: "12345", confirmPassword: "12345" });
    expect(r.fields).toEqual({
      firstName: "Imię musi mieć minimum 2 znaki",
      lastName: "Nazwisko musi mieć minimum 2 znaki",
      email: "Nieprawidłowy email",
      password: "Hasło musi mieć minimum 6 znaków",
      confirmPassword: "Hasło musi mieć minimum 6 znaków",
    });
  });
});
