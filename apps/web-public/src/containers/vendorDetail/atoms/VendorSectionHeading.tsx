import { Box, Typography } from '@sinnapi/ui/atoms';

type Props = {
  /** The small tinted kicker — the tab's own label. */
  eyebrow: string;
  title: string;
  subtitle?: string;
};

/**
 * The heading every tab panel opens with.
 *
 * The tab bar names the section, but only while it is on screen; the moment a
 * reader scrolls a long panel the label is gone. Repeating the tab's word as
 * the eyebrow re-announces the section at the top of its content, and it is
 * what makes a panel legible when it is landed on directly from a shared
 * `?tab=` link rather than arrived at by tapping.
 *
 * It is also the section's `h2`. The hero owns the page's only `h1`, and a
 * crawler reading four sibling `h2`s under it gets the page's outline for free.
 */
export default function VendorSectionHeading({ eyebrow, title, subtitle }: Props) {
  return (
    <Box sx={{ mb: { xs: 2.5, md: 3 } }}>
      <Typography variant="overline" color="primary">
        {eyebrow}
      </Typography>
      <Typography variant="h4" component="h2" sx={{ mt: 0.25 }}>
        {title}
      </Typography>
      {subtitle && (
        <Typography variant="body2" color="text.secondary" sx={{ mt: 1, maxWidth: '62ch' }}>
          {subtitle}
        </Typography>
      )}
    </Box>
  );
}
