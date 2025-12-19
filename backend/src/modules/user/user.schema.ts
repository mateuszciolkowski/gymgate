import { z } from 'zod'

export const UserSchema = z.object({
  id: z.string().uuid(),
  email: z.string().email(),
  firstName: z.string(),
  lastName: z.string(),
  phone: z.string().optional(),
})

export type User = z.infer<typeof UserSchema>
