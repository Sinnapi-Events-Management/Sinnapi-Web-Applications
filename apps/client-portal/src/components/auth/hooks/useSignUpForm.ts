import { useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useZodForm } from '@sinnapi/ui/forms';
import { supabase } from '@/lib/supabase';
import { signUpSchema, emptySignUpValues, toSignUpRole } from '../schema';

/**
 * Account creation state machine. Email confirmation may be required, so the
 * flow has two success shapes: an immediate session (navigate straight in) or
 * `submitted`, which asks the user to confirm via email first.
 *
 * The role select is seeded from `?role=` — narrowed through `toSignUpRole` so
 * a hand-edited query string can't seed the form with a role the schema will
 * then reject on submit.
 */
export function useSignUpForm() {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const [error, setError] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState(false);

  const {
    control,
    handleSubmit,
    formState: { isSubmitting },
  } = useZodForm(signUpSchema, {
    defaultValues: emptySignUpValues(toSignUpRole(params.get('role'))),
  });

  const submit = handleSubmit(async ({ fullName, email, password, role }) => {
    setError(null);
    const { data, error: signUpError } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { full_name: fullName, role },
        emailRedirectTo: `${window.location.origin}/auth/callback`,
      },
    });
    if (signUpError) {
      setError(signUpError.message);
      return;
    }
    if (data.session) {
      navigate('/dashboard', { replace: true });
      return;
    }
    setSubmitted(true);
  });

  return { control, error, loading: isSubmitting, submitted, submit };
}
