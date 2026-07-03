import NextLink from 'next/link';
import {
  Box,
  Typography,
  FormControlLabel,
  Checkbox,
  FormHelperText,
  Link,
  Divider,
} from '@sinnapi/ui';
import { TERMS } from '../data/options';
import type { RegistrationApi } from '../hooks/useVendorRegistration';
import type { RegistrationValues } from '../data/schema';
import RefereesField from './RefereesField';

type Props = { api: RegistrationApi };

type TermKey = Extract<
  keyof RegistrationValues,
  | 'acceptedInfoAccuracy'
  | 'acceptedVendorTerms'
  | 'acceptedEscrowPolicy'
  | 'acceptedFalseInfoRemoval'
>;

/** Step 4 — optional client references and the required terms & confirmation. */
export default function StepReferencesTerms({ api }: Props) {
  const { values, errors, set, submitting } = api;

  return (
    <Box>
      <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>
        Client references (optional)
      </Typography>
      <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 2 }}>
        Past clients who can vouch for your work — this speeds up verification.
      </Typography>
      <RefereesField api={api} />

      <Divider sx={{ my: 3 }} />

      <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>
        Terms &amp; confirmation
      </Typography>
      <Box sx={{ mt: 1 }}>
        {TERMS.map((t) => {
          const key = t.key as TermKey;
          return (
            <Box key={t.key}>
              <FormControlLabel
                sx={{ alignItems: 'flex-start', mt: 1 }}
                control={
                  <Checkbox
                    disabled={submitting}
                    checked={values[key]}
                    onChange={(e) => set(key, e.target.checked)}
                    sx={{ pt: 0.25 }}
                  />
                }
                label={
                  <Typography variant="body2">
                    {t.href ? (
                      <>
                        {t.label.replace(/\.$/, '')}{' '}
                        <Link component={NextLink} href={t.href} target="_blank">
                          (read)
                        </Link>
                      </>
                    ) : (
                      t.label
                    )}
                  </Typography>
                }
              />
              {errors[key] && (
                <FormHelperText error sx={{ ml: 4 }}>
                  {errors[key]}
                </FormHelperText>
              )}
            </Box>
          );
        })}
      </Box>
    </Box>
  );
}
