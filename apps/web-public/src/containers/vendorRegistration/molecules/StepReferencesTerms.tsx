import NextLink from 'next/link';
import {
  Box,
  Typography,
  FormControlLabel,
  Checkbox,
  FormHelperText,
  Link,
  Divider,
} from '@sinnapi/ui/atoms';
import { MarketingConsent } from '@sinnapi/ui/molecules';
import { CaptchaField } from '@sinnapi/ui/forms';
import { TURNSTILE_SITE_KEY } from '@/lib/captcha';
import { TERMS, MARKETING_CONSENT_TEXT } from '../data/options';
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

/**
 * Step 4 — optional client references, the required terms & confirmation, and
 * the human check.
 *
 * The CAPTCHA sits on this step rather than the first because its token expires
 * in minutes and this application takes considerably longer than that to fill
 * in. Here it is solved moments before Submit.
 */
export default function StepReferencesTerms({ api }: Props) {
  const { values, errors, set, submitting, captcha } = api;

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

      <Divider sx={{ my: 3 }} />

      {/* Below the divider, on its own surface, and optional — the four boxes
          above are acceptances required to apply, this is a separate choice.
          GDPR Art.7(2) requires exactly that separation, and Art.7(4) is why
          declining it does not block the application. */}
      <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 1 }}>
        Stay in touch
      </Typography>
      <MarketingConsent
        checked={values.marketingConsent}
        disabled={submitting}
        onChange={(next) => set('marketingConsent', next)}
        label={MARKETING_CONSENT_TEXT}
        description="Occasional emails about growing your business on Sinnapi — new features, seasonal demand and tips from vendors who book well. No more than twice a month."
      />

      <Divider sx={{ my: 3 }} />

      <CaptchaField
        {...captcha.fieldProps}
        siteKey={TURNSTILE_SITE_KEY}
        action="vendor-application"
      />
    </Box>
  );
}
