import type { ReactNode } from 'react';
import { Box, Stack, Typography } from '@sinnapi/ui';

type Props = {
  icon: ReactNode;
  text: string;
};

/** One icon-and-label fact in the hero's quick-glance row. */
export default function HeroMetaItem({ icon, text }: Props) {
  return (
    <Stack direction="row" spacing={0.75} alignItems="center" sx={{ opacity: 0.92, minWidth: 0 }}>
      <Box sx={{ display: 'flex', '& svg': { fontSize: 18 } }}>{icon}</Box>
      <Typography variant="body2" noWrap>
        {text}
      </Typography>
    </Stack>
  );
}
