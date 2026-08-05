import { z } from 'zod';

/**
 * Minimum length for any self-chosen password, portal-wide.
 *
 * One constant behind the forced first-sign-in change and any later reset,
 * matching the client and admin portals. (This portal has no sign-up: vendor
 * accounts are provisioned when an application is approved.)
 */
export const PASSWORD_MIN_LENGTH = 8;

/** Helper text for a password field, kept in step with the rule below. */
export const PASSWORD_HINT = `At least ${PASSWORD_MIN_LENGTH} characters.`;

/** The rule for choosing a *new* password. */
export const newPasswordField = () =>
  z
    .string()
    .min(1, 'Password is required.')
    .min(PASSWORD_MIN_LENGTH, `Password must be at least ${PASSWORD_MIN_LENGTH} characters.`)
    .max(72, 'Password must be 72 characters or fewer.');

/**
 * The rule for entering an *existing* password. Deliberately only "not empty":
 * applying the current policy to a password chosen under an older one would
 * lock people out of their own account at the sign-in screen.
 */
export const existingPasswordField = () => z.string().min(1, 'Password is required.');

/** Trimmed, lowercased email with a single message for every failure mode. */
export const emailField = () =>
  z
    .string()
    .trim()
    .toLowerCase()
    .min(1, 'Email is required.')
    .email('Enter a valid email address, e.g. name@example.com.');
