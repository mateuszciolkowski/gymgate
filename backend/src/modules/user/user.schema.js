import { z } from 'zod';
export const UserSchema = z.object({
    id: z.string().uuid(),
    email: z.string().email(),
    firstName: z.string(),
    lastName: z.string(),
    phone: z.string().optional(),
});
//# sourceMappingURL=user.schema.js.map