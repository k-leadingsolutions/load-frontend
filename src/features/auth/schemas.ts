import { z } from 'zod'

const saMobilePattern = /^\+27\s\d{2}\s\d{3}\s\d{4}$/

export const loginSchema = z.object({
  mobileNumber: z.string().regex(saMobilePattern, 'Use South African format like +27 82 555 0142.'),
  password: z.string().min(8, 'Password must be at least 8 characters.'),
})

export const registerSchema = z
  .object({
    firstName: z.string().min(2, 'First name must be at least 2 characters.'),
    lastName: z.string().min(2, 'Last name must be at least 2 characters.'),
    mobileNumber: z.string().regex(saMobilePattern, 'Use South African format like +27 82 555 0142.'),
    email: z.email('Enter a valid email address.'),
    password: z
      .string()
      .min(8, 'Password must be at least 8 characters.')
      .regex(/[A-Z]/, 'Password must include an uppercase letter.')
      .regex(/[0-9]/, 'Password must include a number.'),
    confirmPassword: z.string(),
  })
  .refine((value) => value.password === value.confirmPassword, {
    path: ['confirmPassword'],
    message: 'Passwords must match.',
  })

export type LoginFormValues = z.infer<typeof loginSchema>
export type RegisterFormValues = z.infer<typeof registerSchema>
