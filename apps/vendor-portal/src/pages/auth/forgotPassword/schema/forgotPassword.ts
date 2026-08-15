import { z } from 'zod';
import { emailField } from '@/components/auth/schema';

/** The address a reset link is asked for. Same email rule as sign-in. */
export const forgotPasswordSchema = z.object({
  email: emailField(),
});

export type ForgotPasswordValues = z.infer<typeof forgotPasswordSchema>;

export const emptyForgotPasswordValues: ForgotPasswordValues = {
  email: '',
};
