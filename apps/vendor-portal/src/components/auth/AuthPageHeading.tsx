import { Box, Typography } from '@sinnapi/ui';

/** Title + optional supporting line above an auth form. */
export default function AuthPageHeading({ title, subtitle }: { title: string; subtitle?: string }) {
  return (
    <Box>
      <Typography variant="h3">{title}</Typography>
      {subtitle && (
        <Typography color="text.secondary" sx={{ mt: 1 }}>
          {subtitle}
        </Typography>
      )}
    </Box>
  );
}
