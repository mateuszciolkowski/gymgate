import { z } from "zod";

export const registerSchema = z.object({
  body: z.object({
    email: z.string().email("Nieprawidłowy email"),
    password: z.string().min(6, "Hasło musi mieć minimum 6 znaków"),
    firstName: z.string().min(2, "Imię musi mieć minimum 2 znaki"),
    lastName: z.string().min(2, "Nazwisko musi mieć minimum 2 znaki"),
    phone: z.string().optional(),
  }),
});

export const loginSchema = z.object({
  body: z.object({
    email: z.string().email("Nieprawidłowy email"),
    password: z.string().min(1, "Hasło jest wymagane"),
  }),
});

export const deleteAccountSchema = z.object({
  body: z.object({ password: z.string().min(1, "Hasło jest wymagane") }),
});

// Mobile sessions: same credentials validation as the PWA endpoints plus optional device info.
const device = {
  deviceId: z.string().min(1).max(128).optional(),
  deviceName: z.string().max(100).optional(),
};

export const mobileRegisterSchema = z.object({ body: registerSchema.shape.body.extend(device) });
export const mobileLoginSchema = z.object({ body: loginSchema.shape.body.extend(device) });
export const refreshTokenSchema = z.object({
  body: z.object({ refreshToken: z.string().min(1, "Token odświeżania jest wymagany").max(200) }),
});

export type RegisterDto = z.infer<typeof registerSchema>["body"];
export type LoginDto = z.infer<typeof loginSchema>["body"];
export type MobileRegisterDto = z.infer<typeof mobileRegisterSchema>["body"];
export type MobileLoginDto = z.infer<typeof mobileLoginSchema>["body"];
