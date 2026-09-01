import { z } from 'zod'

const saMobilePattern = /^\+27\s\d{2}\s\d{3}\s\d{4}$/
const emailOrMobilePattern = /^(\+27\s\d{2}\s\d{3}\s\d{4}|[^\s@]+@[^\s@]+\.[^\s@]+)$/

export const loginSchema = z.object({
  loginMethod: z.enum(['EMAIL', 'MOBILE']),
  emailOrMobile: z.string().regex(emailOrMobilePattern, 'Enter a valid email or mobile number (+27 82 555 0142).'),
  password: z.string().min(8, 'Password must be at least 8 characters.'),
  rememberMe: z.boolean().optional(),
})

export const registerSchema = z
  .object({
    fullName: z.string().min(2, 'First name must be at least 2 characters.'),
    email: z.email('Enter a valid email address.'),
    mobileNumber: z.string().regex(saMobilePattern, 'Use South African format like +27 82 555 0142.'),
    password: z
      .string()
      .min(8, 'Password must be at least 8 characters.')
      .regex(/[A-Z]/, 'Password must include an uppercase letter.')
      .regex(/[0-9]/, 'Password must include a number.')
      .regex(/[^A-Za-z0-9]/, 'Password must include a special character.'),
  })

export const otpSchema = z.object({
  code: z.string().length(6, 'Enter the 6-digit code.').regex(/^\d{6}$/, 'Code must be 6 digits.'),
})

export const forgotPasswordSchema = z.object({
  emailOrMobile: z.string().regex(emailOrMobilePattern, 'Enter a valid email or mobile number.'),
})

export const setNewPasswordSchema = z
  .object({
    password: z
      .string()
      .min(8, 'Password must be at least 8 characters.')
      .regex(/[0-9]/, 'Must include a number.')
      .regex(/[^A-Za-z0-9]/, 'Must include a special character.'),
    confirmPassword: z.string(),
  })
  .refine((v) => v.password === v.confirmPassword, {
    path: ['confirmPassword'],
    message: 'Passwords must match.',
  })

// Legacy schemas kept for compatibility
export const legacyLoginSchema = z.object({
  mobileNumber: z.string().regex(saMobilePattern, 'Use South African format like +27 82 555 0142.'),
  password: z.string().min(8, 'Password must be at least 8 characters.'),
})

export const legacyRegisterSchema = z
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
export type OtpFormValues = z.infer<typeof otpSchema>
export type ForgotPasswordFormValues = z.infer<typeof forgotPasswordSchema>
export type SetNewPasswordFormValues = z.infer<typeof setNewPasswordSchema>
export type LegacyLoginFormValues = z.infer<typeof legacyLoginSchema>
export type LegacyRegisterFormValues = z.infer<typeof legacyRegisterSchema>
