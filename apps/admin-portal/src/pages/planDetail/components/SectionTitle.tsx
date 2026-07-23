import { Box, Stack, Typography } from '@sinnapi/ui';

type Props = { children: React.ReactNode };

/**
 * Section heading with a slim gold (secondary) accent bar — the warm cue that
 * threads the plan detail panels together without repainting the surfaces.
 */
export default function SectionTitle({ children }: Props) {
  return (
    <Stack direction="row" spacing={1.25} alignItems="center">
      <Box
        sx={{ width: 4, height: 18, borderRadius: 1, bgcolor: 'secondary.main', flexShrink: 0 }}
      />
      <Typography variant="h6" fontWeight={700}>
        {children}
      </Typography>
    </Stack>
  );
}
