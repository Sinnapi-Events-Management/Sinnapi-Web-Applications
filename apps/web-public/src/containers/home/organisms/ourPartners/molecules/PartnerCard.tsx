import { Avatar, Box, Paper, Stack, Typography } from '@sinnapi/ui';
import type { Partner } from '../data/partners';

export default function PartnerCard({ partner }: { partner: Partner }) {
  return (
    <Paper
      variant="outlined"
      sx={{
        p: 3,
        height: '100%',
        textAlign: 'center',
        transition: 'box-shadow .25s, transform .25s',
        '& .partner-logo': { filter: 'grayscale(1)', transition: 'filter .25s' },
        '&:hover': { boxShadow: 4, transform: 'translateY(-4px)' },
        '&:hover .partner-logo': { filter: 'grayscale(0)' },
      }}
    >
      <Stack spacing={1.5} alignItems="center">
        <Avatar
          className="partner-logo"
          src={partner.logo}
          alt={partner.name}
          sx={{ width: 56, height: 56, bgcolor: 'primary.main', fontSize: 22 }}
        >
          {partner.name.charAt(0)}
        </Avatar>
        <Box>
          <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
            {partner.name}
          </Typography>
          <Typography variant="caption" color="text.secondary">
            {partner.category}
          </Typography>
        </Box>
      </Stack>
    </Paper>
  );
}
