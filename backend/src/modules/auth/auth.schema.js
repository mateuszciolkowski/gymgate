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
//# sourceMappingURL=auth.schema.js.map