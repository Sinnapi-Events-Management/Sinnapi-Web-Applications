'use client';
import { Box, Stack, Typography } from '@mui/material';
import { alpha } from '@mui/material/styles';
import CheckCircleRoundedIcon from '@mui/icons-material/CheckCircleRounded';
import CancelRoundedIcon from '@mui/icons-material/CancelRounded';

export type PackageScopeListProps = {
  title: string;
  items: readonly string[] | null | undefined;
  /** `included` reads as a promise, `excluded` as a boundary. */
  tone: 'included' | 'excluded';
};

/**
 * What a package covers, and what it does not.
 *
 * Both lists get the same visual weight on purpose. Every study of service
 * quoting says the same thing and every dispute over a delivered event proves
 * it: the argument is almost never about what was promised, it is about what
 * the client assumed was promised. A prominent "not included" list is the
 * cheapest protection either party has, so it is not tucked into a tooltip or
 * greyed into a footnote.
 *
 * Renders nothing when the list is empty rather than an empty heading — a
 * vendor who has not filled in exclusions should not appear to be claiming
 * there are none.
 */
export function PackageScopeList({ title, items, tone }: PackageScopeListProps) {
  if (!items || items.length === 0) return null;

  const included = tone === 'included';
  const Icon = included ? CheckCircleRoundedIcon : CancelRoundedIcon;
  // Semantic palette entries rather than fixed hexes, so both lists keep their
  // contrast when the reader is in dark mode.
  const color = included ? 'success.main' : 'text.disabled';

  return (
    <Box>
      <Typography variant="overline" color="text.secondary" sx={{ display: 'block', mb: 1 }}>
        {title}
      </Typography>
      <Stack spacing={1}>
        {items.map((item, index) => (
          <Stack
            key={`${item}-${index}`}
            direction="row"
            spacing={1.25}
            alignItems="flex-start"
            sx={{ minWidth: 0 }}
          >
            <Icon sx={{ fontSize: 18, mt: '2px', color, flexShrink: 0 }} />
            <Typography
              variant="body2"
              sx={{
                minWidth: 0,
                color: included ? 'text.primary' : 'text.secondary',
                textDecoration: included ? 'none' : 'line-through',
                textDecorationColor: (t) => alpha(t.palette.text.disabled, 0.6),
              }}
            >
              {item}
            </Typography>
          </Stack>
        ))}
      </Stack>
    </Box>
  );
}
