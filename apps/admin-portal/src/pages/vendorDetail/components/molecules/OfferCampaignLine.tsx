import { Stack, Tooltip, Typography } from '@sinnapi/ui';
import CampaignOutlinedIcon from '@mui/icons-material/CampaignOutlined';
import TagOutlinedIcon from '@mui/icons-material/TagOutlined';
import type { AdminOfferModel } from '@/lib/types';

/**
 * What this offer is filed under, above the claim.
 *
 * The distinction the eyebrow exists to make is the one that decides what a
 * withdrawal does. A code under a campaign is one of several, and taking it
 * down takes the campaign's banner and every other code with it; a standalone
 * code stands alone. An operator who cannot see which they are looking at
 * before they open the dialog is being asked to read the consequence for the
 * first time in the confirmation.
 */
export default function OfferCampaignLine({ offer }: { offer: AdminOfferModel }) {
  if (!offer.promotion_id) {
    return (
      <Stack direction="row" spacing={0.5} alignItems="center" sx={{ minWidth: 0 }}>
        <TagOutlinedIcon sx={{ fontSize: 14, color: 'text.disabled' }} />
        <Typography variant="caption" color="text.secondary" noWrap>
          Standalone code
        </Typography>
      </Stack>
    );
  }

  return (
    <Tooltip title={`Campaign ${offer.promotion_public_id ?? ''}`.trim()}>
      <Stack direction="row" spacing={0.5} alignItems="center" sx={{ minWidth: 0 }}>
        <CampaignOutlinedIcon sx={{ fontSize: 14, color: 'text.secondary' }} />
        <Typography variant="caption" color="text.secondary" noWrap>
          {offer.promotion_title ?? 'Campaign'}
        </Typography>
      </Stack>
    </Tooltip>
  );
}
