import { Chip } from '@sinnapi/ui';
import PeopleAltOutlinedIcon from '@mui/icons-material/PeopleAltOutlined';
import StorefrontOutlinedIcon from '@mui/icons-material/StorefrontOutlined';
import { AUDIENCE_META } from '../../schema';
import type { NewsletterAudience } from '@/lib/types';

type Props = { audience: NewsletterAudience; size?: 'small' | 'medium' };

/**
 * Which side of the marketplace a campaign is addressed to.
 *
 * Carries an icon as well as a colour because this is the single most
 * consequential fact about a row — the difference between mailing every client
 * and mailing every vendor — and a list scanned quickly should not rely on two
 * similar words to tell them apart.
 */
export default function AudienceChip({ audience, size = 'small' }: Props) {
  const meta = AUDIENCE_META[audience];
  return (
    <Chip
      size={size}
      variant="outlined"
      color={audience === 'vendors' ? 'secondary' : 'primary'}
      icon={audience === 'vendors' ? <StorefrontOutlinedIcon /> : <PeopleAltOutlinedIcon />}
      label={meta.label}
    />
  );
}
