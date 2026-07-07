import { Chip, Stack } from '@sinnapi/ui/atoms';
import { EventAvailable, PublicOutlined } from '@mui/icons-material';
import { common, palette, withAlpha } from '@sinnapi/ui/tokens';

export interface LegalHeroMetaProps {
  /** Human-readable effective date, e.g. "June 2026". */
  effectiveDate: string;
  /** Optional jurisdiction, e.g. "Global". */
  jurisdiction?: string;
}

const chipSx = {
  color: 'common.white',
  bgcolor: withAlpha(common.white, 0.14),
  fontWeight: 600,
  '& .MuiChip-icon': { color: palette.light.secondary.light },
} as const;

/**
 * The at-a-glance metadata row for a legal hero: when the document takes effect
 * and where it applies, shown as translucent pills that echo the hero eyebrow.
 * Replaces the small print `LegalContent` used to render inline in its header.
 */
export default function LegalHeroMeta({ effectiveDate, jurisdiction }: LegalHeroMetaProps) {
  return (
    <Stack
      direction="row"
      spacing={1.5}
      useFlexGap
      flexWrap="wrap"
      sx={{ mt: 3.5, justifyContent: { md: 'center' } }}
    >
      <Chip
        icon={<EventAvailable sx={{ color: 'inherit !important' }} fontSize="small" />}
        label={`Effective ${effectiveDate}`}
        size="small"
        sx={chipSx}
      />
      {jurisdiction && (
        <Chip
          icon={<PublicOutlined sx={{ color: 'inherit !important' }} fontSize="small" />}
          label={`${jurisdiction} jurisdiction`}
          size="small"
          sx={chipSx}
        />
      )}
    </Stack>
  );
}
