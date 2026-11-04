import { z } from 'zod'
import { passwordSchema } from './password'

export const loginSchema = z.object({
  email: z.string().email('Enter a valid email'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
})
export type LoginInput = z.infer<typeof loginSchema>

export const signupSchema = z.object({
  name: z.string().trim().min(2, 'Enter your name').max(60, 'Name is too long'),
  email: z.string().trim().email('Enter a valid email'),
  password: passwordSchema,
})
export type SignupInput = z.infer<typeof signupSchema>

export const forgotPasswordSchema = z.object({
  email: z.string().email('Enter a valid email'),
})
export type ForgotPasswordInput = z.infer<typeof forgotPasswordSchema>

export const resetPasswordSchema = z
  .object({
    code: z.string().length(6, 'Enter the 6-digit code'),
    newPassword: passwordSchema,
    confirmPassword: z.string().min(1, 'Confirm your password'),
  })
  .refine((data) => data.newPassword === data.confirmPassword, {
    message: "Passwords don't match",
    path: ['confirmPassword'],
  })
export type ResetPasswordInput = z.infer<typeof resetPasswordSchema>

export const verifyEmailSchema = z.object({
  code: z.string().regex(/^\d{6}$/, 'Enter the 6-digit code'),
})
export type VerifyEmailInput = z.infer<typeof verifyEmailSchema>
