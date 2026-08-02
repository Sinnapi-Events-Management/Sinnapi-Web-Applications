import { z } from 'zod';
import { emailField, existingPasswordField } from './password';

export const signInSchema = z.object({
  email: emailField(),
  password: existingPasswordField(),
});

export type SignInValues = z.infer<typeof signInSchema>;

export const emptySignInValues: SignInValues = {
  email: '',
  password: '',
};
