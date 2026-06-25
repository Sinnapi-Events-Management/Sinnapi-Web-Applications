import { Avatar, Paper, Stack, Typography } from '@sinnapi/ui';
import type { Client } from '../data/clients';

export default function ClientChip({ client }: { client: Client }) {
  return (
    <Paper
      variant="outlined"
      sx={{
        flexShrink: 0,
        px: 2.5,
        py: 1.5,
        borderRadius: 999,
        filter: 'grayscale(1)',
        opacity: 0.7,
        transition: 'filter .25s, opacity .25s, box-shadow .25s',
        '&:hover': { filter: 'grayscale(0)', opacity: 1, boxShadow: 3 },
      }}
    >
      <Stack direction="row" spacing={1.5} alignItems="center">
        <Avatar
          src={client.logo}
          alt={client.name}
          sx={{ width: 32, height: 32, bgcolor: 'primary.main', fontSize: 14 }}
        >
          {client.name.charAt(0)}
        </Avatar>
        <Typography variant="subtitle2" sx={{ fontWeight: 600, whiteSpace: 'nowrap' }}>
          {client.name}
        </Typography>
      </Stack>
    </Paper>
  );
}
