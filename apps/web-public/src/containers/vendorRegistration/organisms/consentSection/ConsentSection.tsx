import { Box, Divider } from '@sinnapi/ui/atoms';
import { MarketingConsent } from '@sinnapi/ui/molecules';
import { CaptchaField, type Captcha } from '@sinnapi/ui/forms';
import { TURNSTILE_SITE_KEY } from '@/lib/captcha';
import { MARKETING_CONSENT_DESCRIPTION, MARKETING_CONSENT_TEXT } from '../../data/options';
import type { RegistrationFields } from '../../hooks/useRegistrationFields';
import FormSectionHeading from '../../atoms/FormSectionHeading';
import TermsChecklist from '../../molecules/TermsChecklist';

type Props = { fields: RegistrationFields; captcha: Captcha; disabled: boolean };

/** The required terms, the optional newsletter opt-in, and the human check. */
export default function ConsentSection({ fields, captcha, disabled }: Props) {
  return (
    <Box component="section">
      <FormSectionHeading title="Terms & confirmation" />
      <TermsChecklist fields={fields} disabled={disabled} />

      <Divider sx={{ my: 3 }} />

      {/* Below the divider, under its own heading, and optional — the four boxes
          above are acceptances required to apply, this is a separate choice.
          GDPR Art.7(2) requires exactly that separation, and Art.7(4) is why
          declining it does not block the application. */}
      <FormSectionHeading title="Stay in touch" />
      <MarketingConsent
        checked={fields.values.marketingConsent}
        disabled={disabled}
        onChange={(next) => fields.set('marketingConsent', next)}
        label={MARKETING_CONSENT_TEXT}
        description={MARKETING_CONSENT_DESCRIPTION}
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
