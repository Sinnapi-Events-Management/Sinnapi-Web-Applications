import type { SvgIconComponent } from '@mui/icons-material';
import ReportGmailerrorredIcon from '@mui/icons-material/ReportGmailerrorred';
import GppMaybeIcon from '@mui/icons-material/GppMaybe';
import FlagIcon from '@mui/icons-material/Flag';
import { titleize } from '@/lib/config';

type SeverityMeta = {
  label: string;
  /** MUI palette colour used for the reason chip + card accent. */
  color: 'error' | 'warning' | 'info';
  /** Icon component — caller renders it (keeps this a plain .ts helper). */
  Icon: SvgIconComponent;
};

/**
 * Maps a flag reason to a visual severity. Scam-type reasons are the highest
 * signal (money loss), profanity/abuse next, everything else informational.
 * Presentation-only — keeps colour/icon decisions out of the card component.
 */
export function reasonMeta(reason: string): SeverityMeta {
  const key = reason.toLowerCase();
  if (key.includes('scam') || key.includes('fraud') || key.includes('phish')) {
    return { label: titleize(reason), color: 'error', Icon: ReportGmailerrorredIcon };
  }
  if (
    key.includes('profan') ||
    key.includes('abuse') ||
    key.includes('harass') ||
    key.includes('spam')
  ) {
    return { label: titleize(reason), color: 'warning', Icon: GppMaybeIcon };
  }
  return { label: titleize(reason), color: 'info', Icon: FlagIcon };
}
