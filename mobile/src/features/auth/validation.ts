// Field rules of the PWA forms. The PWA relied on browser validation (required, type=email, minLength=6),
// so the texts for those come from the server wording (D-20): "Nieprawidłowy email", "Hasło musi mieć minimum 6 znaków",
// "Imię musi mieć minimum 2 znaki", "Nazwisko musi mieć minimum 2 znaki".

export const REQUIRED = "Wypełnij to pole";
export const INVALID_EMAIL = "Nieprawidłowy email";
export const SHORT_PASSWORD = "Hasło musi mieć minimum 6 znaków";
export const SHORT_FIRST_NAME = "Imię musi mieć minimum 2 znaki";
export const SHORT_LAST_NAME = "Nazwisko musi mieć minimum 2 znaki";
export const PASSWORD_MISMATCH = "Hasła nie są identyczne";

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export type LoginField = "email" | "password";
export type RegisterField = "firstName" | "lastName" | "email" | "phone" | "password" | "confirmPassword";

export interface LoginValues {
  email: string;
  password: string;
}
export interface RegisterValues {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  password: string;
  confirmPassword: string;
}

const emailError = (v: string) => (!v.trim() ? REQUIRED : EMAIL.test(v.trim()) ? undefined : INVALID_EMAIL);
const passwordError = (v: string) => (!v ? REQUIRED : v.length < 6 ? SHORT_PASSWORD : undefined);

export function validateLogin(v: LoginValues): Partial<Record<LoginField, string>> {
  const errors: Partial<Record<LoginField, string>> = {};
  const email = emailError(v.email);
  const password = passwordError(v.password);
  if (email) errors.email = email;
  if (password) errors.password = password;
  return errors;
}

export interface RegisterErrors {
  fields: Partial<Record<RegisterField, string>>;
  /** Banner error of the PWA `handleSubmit`; only set when every field is valid. */
  form?: string;
}

export function validateRegister(v: RegisterValues): RegisterErrors {
  const fields: Partial<Record<RegisterField, string>> = {};
  if (!v.firstName.trim()) fields.firstName = REQUIRED;
  else if (v.firstName.trim().length < 2) fields.firstName = SHORT_FIRST_NAME;
  if (!v.lastName.trim()) fields.lastName = REQUIRED;
  else if (v.lastName.trim().length < 2) fields.lastName = SHORT_LAST_NAME;
  const email = emailError(v.email);
  if (email) fields.email = email;
  const password = passwordError(v.password);
  if (password) fields.password = password;
  if (!v.confirmPassword) fields.confirmPassword = REQUIRED;
  else if (v.confirmPassword.length < 6) fields.confirmPassword = SHORT_PASSWORD;
  if (Object.keys(fields).length > 0) return { fields };
  if (v.password !== v.confirmPassword) return { fields, form: PASSWORD_MISMATCH };
  return { fields };
}
