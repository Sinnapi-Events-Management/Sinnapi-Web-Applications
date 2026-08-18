import { Box, Button, Chip, IconButton, Stack, StatusChip, Typography } from '@sinnapi/ui';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import VisibilityOutlinedIcon from '@mui/icons-material/VisibilityOutlined';
import SaveOutlinedIcon from '@mui/icons-material/SaveOutlined';
import UndoIcon from '@mui/icons-material/Undo';
import AudienceChip from '@/pages/newsletters/components/molecules/AudienceChip';
import { formatDateTime } from '@/lib/config';
import type { NewsletterCampaignDetail } from '@/lib/types';

type Props = {
  campaign: NewsletterCampaignDetail;
  dirty: boolean;
  busy: string | null;
  editable: boolean;
  onBack: () => void;
  onSave: () => void;
  onPreview: () => void;
  onCancelSchedule: () => void;
};

/** Identity, state, and the actions that apply to the campaign as a whole. */
export default function CampaignHeader({
  campaign,
  dirty,
  busy,
  editable,
  onBack,
  onSave,
  onPreview,
  onCancelSchedule,
}: Props) {
  return (
    <Stack
      direction={{ xs: 'column', md: 'row' }}
      spacing={2}
      alignItems={{ md: 'flex-start' }}
      justifyContent="space-between"
      sx={{ mb: 3 }}
    >
      <Stack direction="row" spacing={1.5} alignItems="flex-start" sx={{ minWidth: 0 }}>
        <IconButton onClick={onBack} aria-label="Back to campaigns" sx={{ mt: 0.25 }}>
          <ArrowBackIcon />
        </IconButton>
        <Box sx={{ minWidth: 0 }}>
          <Typography variant="h5" sx={{ fontWeight: 700 }} noWrap>
            {campaign.title}
          </Typography>
          <Stack
            direction="row"
            spacing={1}
            alignItems="center"
            sx={{ mt: 1 }}
            flexWrap="wrap"
            useFlexGap
          >
            <StatusChip status={campaign.status} />
            <AudienceChip audience={campaign.audience} />
            {campaign.status === 'scheduled' && campaign.scheduled_at && (
              <Chip
                size="small"
                variant="outlined"
                label={`Sends ${formatDateTime(campaign.scheduled_at)}`}
              />
            )}
            {dirty && (
              <Chip size="small" color="warning" variant="outlined" label="Unsaved changes" />
            )}
          </Stack>
        </Box>
      </Stack>

      <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
        {/* Only offered while it can still be honoured. Once the worker has
            claimed the campaign it is `sending`, and there is no truthful way
            to un-send batches already handed to the provider. */}
        {campaign.status === 'scheduled' && (
          <Button
            variant="outlined"
            color="warning"
            startIcon={<UndoIcon />}
            disabled={busy === 'cancel'}
            onClick={onCancelSchedule}
          >
            Cancel schedule
          </Button>
        )}
        <Button
          variant="outlined"
          startIcon={<VisibilityOutlinedIcon />}
          disabled={busy === 'preview'}
          onClick={onPreview}
        >
          {busy === 'preview' ? 'Rendering…' : 'Preview'}
        </Button>
        {editable && (
          <Button
            variant="contained"
            startIcon={<SaveOutlinedIcon />}
            disabled={!dirty || busy === 'save'}
            onClick={onSave}
          >
            {busy === 'save' ? 'Saving…' : 'Save'}
          </Button>
        )}
      </Stack>
    </Stack>
  );
}
