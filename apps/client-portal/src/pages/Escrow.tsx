import { Card, CardContent, Stack, Typography, Box, Divider } from "@mui/material";
import PageTitle from "@/components/ui/PageTitle";
import EmptyState from "@/components/ui/EmptyState";
import StatusChip from "@/components/ui/StatusChip";
import QueryState from "@/components/ui/QueryState";
import EscrowActions from "@/components/escrow/EscrowActions";
import { useEscrow } from "@/hooks/queries";
import { formatMoney } from "@/lib/config";
import { one } from "@/lib/rel";

export default function Escrow() {
  const { data, isLoading, error } = useEscrow();
  const rows = data ?? [];

  return (
    <>
      <PageTitle title="Escrow" subtitle="Funds held safely until you confirm the service." />
      <QueryState isLoading={isLoading} error={error}>
        {rows.length === 0 ? (
          <EmptyState title="No escrow transactions" description="When you pay for a booking via Sinnapi Escrow, it appears here." />
        ) : (
          <Stack spacing={2}>
            {rows.map((e: any) => (
              <Card key={e.id} variant="outlined">
                <CardContent>
                  <Stack direction={{ xs: "column", sm: "row" }} justifyContent="space-between" spacing={2}>
                    <Box>
                      <Typography variant="h6">{one<any>(e.vendors)?.business_name ?? "Vendor"}</Typography>
                      <Typography variant="body2" color="text.secondary">Booking {one<any>(e.bookings)?.reference_no ?? "—"}</Typography>
                    </Box>
                    <Box sx={{ textAlign: { sm: "right" } }}>
                      <Typography variant="h6">{formatMoney(e.gross_amount, e.currency)}</Typography>
                      <StatusChip status={e.status} />
                    </Box>
                  </Stack>
                  <Divider sx={{ my: 2 }} />
                  <EscrowActions escrowId={e.id} status={e.status} />
                </CardContent>
              </Card>
            ))}
          </Stack>
        )}
      </QueryState>
    </>
  );
}
