import { Box, Typography } from '@sinnapi/ui';

type Props = {
  /** The small tinted kicker — usually the tab's own label. */
  eyebrow: string;
  title: string;
  subtitle?: string;
};

/**
 * The heading every tab panel opens with.
 *
 * A tab bar tells the reader which section they are in, but only while it is on
 * screen; the moment they scroll a long panel the label is gone. Repeating the
 * tab's own word as the eyebrow means the section re-announces itself at the
 * top of its content, and it is what makes a panel legible when it is landed on
 * directly from a `?tab=` link rather than arrived at by tapping.
 */
export default function VendorSectionHeading({ eyebrow, title, subtitle }: Props) {
  return (
    <Box sx={{ mb: 2.5 }}>
      <Typography variant="overline" color="secondary">
        {eyebrow}
      </Typography>
      <Typography variant="h5" sx={{ mt: 0.25 }}>
        {title}
      </Typography>
      {subtitle && (
        <Typography variant="body2" color="text.secondary" sx={{ mt: 0.75, maxWidth: '62ch' }}>
          {subtitle}
        </Typography>
      )}
    </Box>
  );
}
