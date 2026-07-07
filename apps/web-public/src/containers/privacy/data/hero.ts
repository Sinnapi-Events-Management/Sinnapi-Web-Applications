import { PrivacyTip } from '@mui/icons-material';
import { palette } from '@sinnapi/ui/tokens';
import { IMAGES } from '@/lib/assets';
import type { LegalHeroChrome } from '@/components/organisms/legalHero';

/** Hero identity for the Privacy Policy page — teal-accented, trust-focused. */
export const privacyHero: LegalHeroChrome = {
  eyebrow: 'Your privacy',
  Icon: PrivacyTip,
  tagline:
    'What personal data we collect, why we collect it, and the controls you have over it — because trust starts with transparency.',
  image: IMAGES.receptionAutumn,
  accentColor: palette.light.primary.light,
};
