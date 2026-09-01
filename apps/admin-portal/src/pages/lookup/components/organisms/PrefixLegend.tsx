import { Box, Typography } from '@mui/material';
import KeyIcon from '@mui/icons-material/VpnKeyOutlined';
import { SectionCard } from '@sinnapi/ui';
import { PUBLIC_ID_CATEGORIES } from '@sinnapi/utils/publicId';

/**
 * What the two-letter prefixes mean.
 *
 * Here because a support agent on a call cannot look this up anywhere else, and
 * the second letter is the fastest way to know whether a caller is reading a
 * payment reference or a payout reference before either is searched.
 *
 * Built from `PUBLIC_ID_CATEGORIES` rather than written out, so a prefix added
 * to the map appears here without anyone remembering to update a table.
 *
 * LAYOUT: an auto-fill grid rather than fixed breakpoints. The cells have a
 * known minimum and the column count falls out of the width, which is what
 * keeps two columns on a phone and five or six on a desktop without four
 * breakpoint rules that would each need re-tuning if a category were added.
 */
export default function PrefixLegend() {
  return (
    <SectionCard title="What the prefixes mean" icon={<KeyIcon />} accent="secondary">
      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))',
          gap: 1,
        }}
      >
        {Object.entries(PUBLIC_ID_CATEGORIES).map(([prefix, label]) => (
          <Box
            key={prefix}
            sx={{
              display: 'flex',
              alignItems: 'baseline',
              gap: 1,
              px: 1,
              py: 0.75,
              borderRadius: 1,
              // `action.hover` is a theme token that resolves to a light wash on
              // the light theme and a lift on the dark one, so the cell reads as
              // a surface in both without either being hard-coded.
              bgcolor: 'action.hover',
            }}
          >
            <Typography
              variant="body2"
              sx={{
                fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Consolas, monospace',
                fontWeight: 700,
                color: 'primary.main',
              }}
            >
              {prefix}
            </Typography>
            <Typography variant="caption" color="text.secondary" sx={{ minWidth: 0 }}>
              {label}
            </Typography>
          </Box>
        ))}
      </Box>
      <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 2 }}>
        Every ID is ten characters: two letters, then five digits and three letters in any order. I,
        L, O and U are never used, so they can only ever be 1, 1, 0 and a mistake.
      </Typography>
    </SectionCard>
  );
}
