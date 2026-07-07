import { Storefront } from '@mui/icons-material';
import { palette } from '@sinnapi/ui/tokens';
import { IMAGES } from '@/lib/assets';
import type { LegalHeroChrome } from '@/components/organisms/legalHero';

/** Hero identity for the Vendor Terms page — gold-accented, vendor-facing. */
export const vendorTermsHero: LegalHeroChrome = {
  eyebrow: 'Vendor agreement',
  Icon: Storefront,
  tagline:
    'The commitments that govern how vendors list, get discovered, and get paid on Sinnapi — clear, fair, and built to help your business grow.',
  image: IMAGES.receptionAutumn,
  accentColor: palette.light.secondary.light,
};
