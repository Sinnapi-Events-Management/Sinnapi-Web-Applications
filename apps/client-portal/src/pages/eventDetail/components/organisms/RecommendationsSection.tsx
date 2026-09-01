import { useState } from 'react';
import {
  Alert,
  Box,
  Chip,
  MenuItem,
  QueryState,
  SectionCard,
  Skeleton,
  Stack,
  TextField,
  Typography,
} from '@sinnapi/ui';
import AutoAwesomeOutlinedIcon from '@mui/icons-material/AutoAwesomeOutlined';
import { useEventVendorMutations } from '@/hooks/queries';
import type { EventRequirementModel, VendorRecommendationModel } from '@/lib/types';
import RecommendationCard from '../molecules/RecommendationCard';
import { useRecommendations, type RecommendationFilters } from '../../hooks/useRecommendations';

type Props = {
  eventId: string;
  requirements: EventRequirementModel[];
  eventCurrency: string;
};

const FILTER_LABELS: { key: keyof RecommendationFilters; label: string; hint: string }[] = [
  { key: 'onlyAvailable', label: 'Free on my date', hint: 'Hide vendors already booked that day' },
  {
    key: 'withinBudget',
    label: 'Fits my budget',
    hint: 'Hide vendors whose starting price is over what is left on this line',
  },
  {
    key: 'matchRegion',
    label: 'Covers my area',
    hint: 'Hide vendors who do not serve this location',
  },
];

/**
 * Vendors the platform suggests for a line nobody is filling yet.
 *
 * Sits below the board rather than beside it, because it answers the question
 * the board raises: "nobody is on Decor" is only useful next to "here is who
 * could be".
 *
 * FILTERS ARE CHIPS, NOT A FORM. Three booleans behind a "Filters" disclosure
 * would hide the very thing that makes this panel trustworthy — that the client
 * can see what is being excluded and turn it off. As toggle chips they are
 * always visible, always reversible, and the count of what they removed is one
 * glance away.
 */
export default function RecommendationsSection({ eventId, requirements, eventCurrency }: Props) {
  const rec = useRecommendations(eventId, requirements);
  const { invite } = useEventVendorMutations(eventId);
  const [invited, setInvited] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);

  const send = async (row: VendorRecommendationModel) => {
    setError(null);
    try {
      await invite.mutateAsync({ vendorId: row.vendor_id, requirementId: rec.requirementId });
      setInvited((prev) => [...prev, row.vendor_id]);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not send that invitation.');
    }
  };

  if (rec.requirements.length === 0) {
    return (
      <SectionCard title="Suggested vendors" icon={<AutoAwesomeOutlinedIcon />}>
        <Alert severity="info">
          Add a line to your plan — catering, photography, decor — and we will suggest vendors who
          could cover it.
        </Alert>
      </SectionCard>
    );
  }

  return (
    <SectionCard
      title="Suggested vendors"
      icon={<AutoAwesomeOutlinedIcon />}
      subtitle="Vendors who could cover a part of your plan nobody has taken yet."
    >
      {error && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      <Stack spacing={2}>
        <TextField
          select
          label="Suggestions for"
          value={rec.requirementId ?? ''}
          onChange={(e) => rec.setRequirementId(e.target.value)}
          sx={{ maxWidth: { sm: 340 } }}
        >
          {rec.requirements.map((r) => (
            <MenuItem key={r.id} value={r.id}>
              {r.title ?? r.category_name}
              {r.state === 'open' ? ' — no vendor yet' : ''}
            </MenuItem>
          ))}
        </TextField>

        <Box>
          <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 0.75 }}>
            Narrow these down
          </Typography>
          <Stack direction="row" spacing={1} sx={{ flexWrap: 'wrap' }} useFlexGap>
            {FILTER_LABELS.map(({ key, label, hint }) => (
              <Chip
                key={key}
                label={label}
                title={hint}
                clickable
                color={rec.filters[key] ? 'secondary' : 'default'}
                variant={rec.filters[key] ? 'filled' : 'outlined'}
                onClick={() => rec.toggle(key)}
                // A chip acting as a switch has to say so; without this a
                // screen reader announces a button with no state at all.
                role="switch"
                aria-checked={rec.filters[key]}
              />
            ))}
          </Stack>
        </Box>

        <QueryState
          isLoading={rec.isLoading}
          error={rec.error}
          loadingFallback={
            <Box
              sx={{
                display: 'grid',
                gridTemplateColumns: { xs: '1fr', md: 'repeat(2, minmax(0, 1fr))' },
                gap: 2,
              }}
            >
              <Skeleton variant="rounded" height={190} />
              <Skeleton variant="rounded" height={190} />
            </Box>
          }
        >
          {rec.rows.length === 0 ? (
            <Alert severity="info">
              {rec.activeFilterCount > 0
                ? 'No vendors match all of those filters. Try turning one off — every vendor still shows whether they are free, in your area and within budget.'
                : 'We have nobody to suggest for this line yet. Vendors are added to the marketplace all the time, and anyone browsing your event can still put their hand up.'}
            </Alert>
          ) : (
            <Box
              sx={{
                display: 'grid',
                gridTemplateColumns: { xs: '1fr', md: 'repeat(2, minmax(0, 1fr))' },
                gap: 2,
                // Keeps the grid from flashing empty while a filter toggle
                // refetches — `keepPreviousData` holds the old rows, and this
                // says they are stale rather than swapping them for a spinner.
                opacity: rec.isFetching ? 0.6 : 1,
                transition: (t) => t.transitions.create('opacity'),
              }}
            >
              {rec.rows.map((row) => (
                <RecommendationCard
                  key={row.vendor_id}
                  row={row}
                  eventCurrency={eventCurrency}
                  invited={invited.includes(row.vendor_id)}
                  busy={invite.isPending && invite.variables?.vendorId === row.vendor_id}
                  onInvite={send}
                />
              ))}
            </Box>
          )}
        </QueryState>
      </Stack>
    </SectionCard>
  );
}
