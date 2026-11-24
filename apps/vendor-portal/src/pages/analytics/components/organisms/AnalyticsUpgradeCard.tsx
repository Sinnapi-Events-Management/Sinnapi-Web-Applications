import { Link as RouterLink } from 'react-router-dom';
import { Box, Button, Grid, Paper, Stack, Typography, alpha } from '@sinnapi/ui';
import InsightsIcon from '@mui/icons-material/Insights';
import PaidIcon from '@mui/icons-material/Paid';
import TimelineIcon from '@mui/icons-material/Timeline';
import GroupsIcon from '@mui/icons-material/Groups';
import FileDownloadIcon from '@mui/icons-material/FileDownload';

// What the entitlement actually buys, in the order the tabs present it. Named
// concretely rather than as "advanced reporting": a vendor deciding whether to
// pay needs to recognise a question they already have.
const INCLUDED = [
  {
    icon: <PaidIcon />,
    title: 'Your money over time',
    body: 'How much was booked, held by Sinnapi and paid to you — for a week, a month or a year.',
  },
  {
    icon: <TimelineIcon />,
    title: 'How quickly you win work',
    body: 'Which prices clients say yes to, how fast you answer, and how early clients book.',
  },
  {
    icon: <GroupsIcon />,
    title: 'Where your clients come from',
    body: 'Which services earn most, which clients come back, and your busiest months.',
  },
  {
    icon: <FileDownloadIcon />,
    title: 'Export to Excel or PDF',
    body: 'Download your numbers to share with your accountant or bank.',
  },
];

/**
 * What a Starter vendor sees in place of the page.
 *
 * It names what the entitlement buys rather than only stating that it is
 * locked — and it says plainly that the operational numbers are still free on
 * the dashboard, so the page never reads as "your data is being withheld".
 * That distinction matters: the vendor's figures are theirs, and what is being
 * sold here is the analysis, not access to their own books.
 */
export default function AnalyticsUpgradeCard() {
  return (
    <Paper
      variant="outlined"
      sx={{
        borderRadius: 3,
        p: { xs: 2.5, sm: 4 },
        // A single faint gold corner glow, matching the portals' hero
        // treatment — enough to mark this as a promoted surface without
        // becoming a coloured panel in either scheme.
        backgroundImage: (t) =>
          `radial-gradient(120% 120% at 100% 0%, ${alpha(t.palette.secondary.main, 0.1)} 0%, transparent 55%)`,
      }}
    >
      <Stack spacing={1} sx={{ maxWidth: 640 }}>
        <Box sx={{ color: 'secondary.main', display: 'flex' }}>
          <InsightsIcon fontSize="large" />
        </Box>
        <Typography variant="h4">See what is driving your business</Typography>
        <Typography color="text.secondary">
          Professional and Elite plans show you why your business is growing — and where to improve.
        </Typography>
      </Stack>

      <Grid container spacing={2.5} sx={{ mt: 1.5 }}>
        {INCLUDED.map((item) => (
          <Grid key={item.title} item xs={12} sm={6}>
            <Stack direction="row" spacing={1.5} alignItems="flex-start">
              <Box sx={{ color: 'secondary.main', display: 'flex', mt: '2px', flexShrink: 0 }}>
                {item.icon}
              </Box>
              <Box sx={{ minWidth: 0 }}>
                <Typography variant="subtitle2">{item.title}</Typography>
                <Typography variant="body2" color="text.secondary">
                  {item.body}
                </Typography>
              </Box>
            </Stack>
          </Grid>
        ))}
      </Grid>

      <Stack
        direction={{ xs: 'column', sm: 'row' }}
        spacing={1.5}
        alignItems={{ sm: 'center' }}
        sx={{ mt: 4 }}
      >
        <Button component={RouterLink} to="/subscription" variant="contained" size="large">
          Compare plans
        </Button>
        <Typography variant="body2" color="text.secondary">
          The money, bookings and reviews numbers above stay free on every plan.
        </Typography>
      </Stack>
    </Paper>
  );
}
