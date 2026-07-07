import { Gavel } from '@mui/icons-material';
import { palette } from '@sinnapi/ui/tokens';
import { IMAGES } from '@/lib/assets';
import type { LegalHeroChrome } from '@/components/organisms/legalHero';

/** Hero identity for the General Terms page — gold-accented, platform-wide. */
export const termsHero: LegalHeroChrome = {
  eyebrow: 'General terms',
  Icon: Gavel,
  tagline:
    'The ground rules for everyone on Sinnapi — how the platform works, what you can expect from us, and what we ask of every client and vendor.',
  image: IMAGES.receptionAutumn,
  accentColor: palette.light.secondary.light,
};
