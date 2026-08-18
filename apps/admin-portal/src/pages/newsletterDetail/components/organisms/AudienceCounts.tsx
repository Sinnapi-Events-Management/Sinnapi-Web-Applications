import { Grid, Alert, Stack, Typography } from '@sinnapi/ui';
import GroupsOutlinedIcon from '@mui/icons-material/GroupsOutlined';
import MarkEmailReadOutlinedIcon from '@mui/icons-material/MarkEmailReadOutlined';
import DoNotDisturbOnOutlinedIcon from '@mui/icons-material/DoNotDisturbOnOutlined';
import HelpOutlineIcon from '@mui/icons-material/HelpOutline';
import SummaryTile from '@/components/ui/SummaryTile';
import type { NewsletterAudienceCounts } from '@/lib/types';

type Props = { counts?: NewsletterAudienceCounts; loading?: boolean; audienceLabel: string };

/**
 * How much of an audience is actually reachable.
 *
 * The gap between "total" and "can be mailed" is the single most important
 * number on this screen, and it is the one a marketing tool normally hides. It
 * is shown first here because every other decision follows from it — and
 * because a low reachable count is not a bug to route around, it is the honest
 * state of consent and the argument for asking for it better at sign-up.
 */
export default function AudienceCounts({ counts, loading, audienceLabel }: Props) {
  const total = counts?.total ?? 0;
  const eligible = counts?.eligible ?? 0;
  const share = total > 0 ? Math.round((eligible / total) * 100) : 0;

  return (
    <Stack spacing={2}>
      <Grid container spacing={2}>
        <Grid item xs={6} md={3}>
          <SummaryTile
            label={`${audienceLabel} total`}
            value={total}
            icon={<GroupsOutlinedIcon />}
            loading={loading}
          />
        </Grid>
        <Grid item xs={6} md={3}>
          <SummaryTile
            label="Can be mailed"
            value={eligible}
            icon={<MarkEmailReadOutlinedIcon />}
            accent="success"
            loading={loading}
          />
        </Grid>
        <Grid item xs={6} md={3}>
          <SummaryTile
            label="No consent"
            value={counts?.no_consent ?? 0}
            icon={<HelpOutlineIcon />}
            accent="warning"
            loading={loading}
          />
        </Grid>
        <Grid item xs={6} md={3}>
          <SummaryTile
            label="Suppressed"
            value={counts?.suppressed ?? 0}
            icon={<DoNotDisturbOnOutlinedIcon />}
            accent="error"
            loading={loading}
          />
        </Grid>
      </Grid>

      {!loading && total > 0 && eligible === 0 && (
        <Alert severity="warning">
          <Typography variant="body2">
            None of these {total.toLocaleString()} accounts has opted in to this topic yet, so there
            is nobody here to send to. Consent is only collected at sign-up, so an existing user
            base starts at zero and grows from there.{' '}
            {/* The dead end is only dead for this source. Said here, where the
                zero is, rather than left for the operator to find. */}
            <strong>
              The other three sources above — by hand, a spreadsheet, or a saved address book — take
              recipients who are not account holders.
            </strong>
          </Typography>
        </Alert>
      )}

      {!loading && eligible > 0 && (
        <Typography variant="body2" color="text.secondary">
          You can reach <strong>{eligible.toLocaleString()}</strong> of {total.toLocaleString()}{' '}
          {audienceLabel.toLowerCase()} ({share}%).
        </Typography>
      )}
    </Stack>
  );
}
