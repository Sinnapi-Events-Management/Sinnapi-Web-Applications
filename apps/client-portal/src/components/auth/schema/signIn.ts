import { z } from 'zod';
import { emailField, existingPasswordField } from './password';

export const signInSchema = z.object({
  email: emailField(),
  password: existingPasswordField(),
  /**
   * "Keep me signed in on this device". Ticked by default: almost everyone
   * signs in on their own phone and expects to stay signed in, as on Facebook.
   * Unticked is for a shared phone or an internet café — see
   * `@sinnapi/utils/sessionPersistence`.
   */
  remember: z.boolean(),
});

export type SignInValues = z.infer<typeof signInSchema>;

export const emptySignInValues: SignInValues = {
  email: '',
  password: '',
  remember: true,
};
