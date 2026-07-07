import { Lock } from '@mui/icons-material';
import { palette } from '@sinnapi/ui/tokens';
import { IMAGES } from '@/lib/assets';
import type { LegalHeroChrome } from '@/components/organisms/legalHero';

/** Hero identity for the Escrow Policy page — gold-accented, protection-focused. */
export const escrowPolicyHero: LegalHeroChrome = {
  eyebrow: 'Payment protection',
  Icon: Lock,
  tagline:
    'How Sinnapi holds your payment securely and releases it to the vendor only once you confirm the service was delivered as promised.',
  image: IMAGES.receptionAutumn,
  accentColor: palette.light.secondary.light,
};
