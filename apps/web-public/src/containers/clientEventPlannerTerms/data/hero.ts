import { Celebration } from '@mui/icons-material';
import { palette } from '@sinnapi/ui/tokens';
import { IMAGES } from '@/lib/assets';
import type { LegalHeroChrome } from '@/components/organisms/legalHero';

/** Hero identity for the Client & Event Planner Terms page — teal-accented. */
export const clientEventPlannerTermsHero: LegalHeroChrome = {
  eyebrow: 'Client & planner agreement',
  Icon: Celebration,
  tagline:
    'How clients and event planners discover, book, and pay for services on Sinnapi — so every event stays protected from first enquiry to final delivery.',
  image: IMAGES.receptionAutumn,
  accentColor: palette.light.primary.light,
};
