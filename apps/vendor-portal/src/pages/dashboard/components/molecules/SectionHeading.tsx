import { Box, Stack, Typography } from '@sinnapi/ui';

type Props = {
  title: string;
  subtitle?: string;
  /** Right-aligned slot for a link or control belonging to this section. */
  action?: React.ReactNode;
};

/**
 * The label above a dashboard band. Lighter than a card header on purpose —
 * these separate groups of cards, so competing with the cards' own titles would
 * flatten the hierarchy the page depends on.
 */
export default function SectionHeading({ title, subtitle, action }: Props) {
  return (
    <Stack
      direction="row"
      alignItems="center"
      justifyContent="space-between"
      spacing={2}
      sx={{ mb: 1.5 }}
    >
      <Box sx={{ minWidth: 0 }}>
        <Typography variant="h6" sx={{ lineHeight: 1.25 }}>
          {title}
        </Typography>
        {subtitle && (
          <Typography variant="caption" color="text.secondary">
            {subtitle}
          </Typography>
        )}
      </Box>
      {action}
    </Stack>
  );
}
