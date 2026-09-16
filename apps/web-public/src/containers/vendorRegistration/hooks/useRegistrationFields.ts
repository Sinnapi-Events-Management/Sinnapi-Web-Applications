'use client';
import { useState } from 'react';
import {
  INITIAL_VALUES,
  registrationSchema,
  type FieldErrors,
  type FieldKey,
  type RegistrationValues,
} from '../data/schema';

/** Values, per-field errors and whole-form validation for the application. */
export function useRegistrationFields() {
  const [values, setValues] = useState<RegistrationValues>(INITIAL_VALUES);
  const [errors, setErrors] = useState<FieldErrors>({});

  function set<K extends FieldKey>(key: K, value: RegistrationValues[K]) {
    setValues((v) => ({ ...v, [key]: value }));
    setErrors((e) => (e[key] ? { ...e, [key]: undefined } : e));
  }

  /** Checks every field and shows the errors. Returns the first invalid field, or null. */
  function validate(): FieldKey | null {
    const parsed = registrationSchema.safeParse(values);
    if (parsed.success) {
      setErrors({});
      return null;
    }
    const next: FieldErrors = {};
    parsed.error.issues.forEach((issue) => {
      const key = issue.path[0] as FieldKey;
      next[key] ??= issue.message;
    });
    setErrors(next);
    return parsed.error.issues[0].path[0] as FieldKey;
  }

  return { values, errors, set, validate };
}

export type RegistrationFields = ReturnType<typeof useRegistrationFields>;
