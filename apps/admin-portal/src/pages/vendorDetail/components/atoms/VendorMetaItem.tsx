import type { ReactNode } from 'react';
import { Box, Stack, Typography } from '@sinnapi/ui';

type Props = { icon: ReactNode; text: string };

/**
 * One icon-and-value pair on the vendor hero's meta row.
 *
 * `noWrap` on the text and a fixed icon size, so a row of five of these wraps
 * as whole items on a phone rather than breaking an email address across two
 * lines under an orphaned icon.
 */
export default function VendorMetaItem({ icon, text }: Props) {
  return (
    <Stack direction="row" spacing={0.75} alignItems="center" sx={{ opacity: 0.92, minWidth: 0 }}>
      <Box sx={{ display: 'flex', '& svg': { fontSize: 18 } }}>{icon}</Box>
      <Typography variant="body2" noWrap>
        {text}
      </Typography>
    </Stack>
  );
}
