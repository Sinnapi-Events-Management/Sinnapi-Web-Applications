import { Link as RouterLink } from "react-router-dom";
import { Grid, Card, CardContent, Typography, Button, Stack, Box } from "@mui/material";
import EventNoteIcon from "@mui/icons-material/EventNote";
import RequestQuoteIcon from "@mui/icons-material/RequestQuote";
import AccountBalanceIcon from "@mui/icons-material/AccountBalance";
import NotificationsIcon from "@mui/icons-material/Notifications";
import SearchIcon from "@mui/icons-material/Search";
import PageTitle from "@/components/ui/PageTitle";
import StatCard from "@/components/ui/StatCard";
import StatusChip from "@/components/ui/StatusChip";
import QueryState from "@/components/ui/QueryState";
import { useDashboardCounts, useBookings, useProfile } from "@/hooks/queries";
import { formatDate, formatMoney } from "@/lib/config";
import { one } from "@/lib/rel";

export default function Dashboard() {
  const counts = useDashboardCounts();
  const bookings = useBookings();
  const { data: profile } = useProfile();
  const upcoming = (bookings.data ?? []).filter((b: any) => ["requested", "confirmed", "in_progress"].includes(b.status)).slice(0, 5);

  return (
    <>
      <PageTitle
        title={`Welcome${profile?.full_name ? `, ${profile.full_name.split(" ")[0]}` : ""}`}
        subtitle="Here's what's happening with your events."
        action={<Button component={RouterLink} to="/discover" variant="contained" startIcon={<SearchIcon />}>Find vendors</Button>}
      />
      <QueryState isLoading={counts.isLoading} error={counts.error}>
        <Grid container spacing={3} sx={{ mb: 4 }}>
          <Grid item xs={6} md={3}><StatCard label="Active bookings" value={counts.data?.activeBookings ?? 0} to="/bookings" icon={<EventNoteIcon />} /></Grid>
          <Grid item xs={6} md={3}><StatCard label="Open quotes" value={counts.data?.openQuotes ?? 0} to="/quotations" icon={<RequestQuoteIcon />} /></Grid>
          <Grid item xs={6} md={3}><StatCard label="In escrow" value={counts.data?.escrowHeld ?? 0} to="/escrow" icon={<AccountBalanceIcon />} /></Grid>
          <Grid item xs={6} md={3}><StatCard label="Unread" value={counts.data?.unread ?? 0} to="/notifications" icon={<NotificationsIcon />} /></Grid>
        </Grid>
      </QueryState>

      <Card variant="outlined">
        <CardContent>
          <Typography variant="h5" sx={{ mb: 2 }}>Upcoming bookings</Typography>
          <QueryState isLoading={bookings.isLoading} error={bookings.error}>
            {upcoming.length === 0 ? (
              <Box sx={{ py: 4, textAlign: "center", color: "text.secondary" }}>
                <Typography>No upcoming bookings.</Typography>
                <Button component={RouterLink} to="/discover" sx={{ mt: 1 }}>Discover vendors</Button>
              </Box>
            ) : (
              <Stack spacing={1.5}>
                {upcoming.map((b: any) => (
                  <Stack key={b.id} direction="row" justifyContent="space-between" alignItems="center"
                    component={RouterLink} to={`/bookings/${b.id}`} sx={{ textDecoration: "none", color: "inherit", py: 1, borderBottom: 1, borderColor: "divider" }}>
                    <Box>
                      <Typography fontWeight={600}>{one<any>(b.vendors)?.business_name ?? "Vendor"}</Typography>
                      <Typography variant="body2" color="text.secondary">{b.reference_no} · {formatDate(b.event_date)}</Typography>
                    </Box>
                    <Stack direction="row" spacing={2} alignItems="center">
                      <Typography variant="body2">{formatMoney(b.amount, b.currency)}</Typography>
                      <StatusChip status={b.status} />
                    </Stack>
                  </Stack>
                ))}
              </Stack>
            )}
          </QueryState>
        </CardContent>
      </Card>
    </>
  );
}
