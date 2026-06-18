import { useNavigate } from "react-router-dom";
import { Card, Table, TableHead, TableRow, TableCell, TableBody, Typography } from "@mui/material";
import PageTitle from "@/components/ui/PageTitle";
import EmptyState from "@/components/ui/EmptyState";
import StatusChip from "@/components/ui/StatusChip";
import QueryState from "@/components/ui/QueryState";
import VendorGate from "@/vendor/VendorGate";
import { useVendorBookings } from "@/hooks/queries";
import { formatDate, formatMoney } from "@/lib/config";
import { one } from "@/lib/rel";

function BookingsTable({ vendorId }: { vendorId: string }) {
  const navigate = useNavigate();
  const { data, isLoading, error } = useVendorBookings(vendorId);
  const rows = data ?? [];
  return (
    <QueryState isLoading={isLoading} error={error}>
      {rows.length === 0 ? (
        <EmptyState title="No bookings yet" description="Booking requests from clients will appear here." />
      ) : (
        <Card variant="outlined">
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>Reference</TableCell><TableCell>Client</TableCell><TableCell>Date</TableCell>
                <TableCell align="right">Amount</TableCell><TableCell>Status</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {rows.map((b: any) => (
                <TableRow key={b.id} hover sx={{ cursor: "pointer" }} onClick={() => navigate(`/bookings/${b.id}`)}>
                  <TableCell><Typography variant="body2">{b.reference_no}</Typography></TableCell>
                  <TableCell>{one<any>(b.profiles)?.full_name ?? "Client"}</TableCell>
                  <TableCell>{formatDate(b.event_date)}</TableCell>
                  <TableCell align="right">{formatMoney(b.amount, b.currency)}</TableCell>
                  <TableCell><StatusChip status={b.status} /></TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Card>
      )}
    </QueryState>
  );
}

export default function Bookings() {
  return (
    <>
      <PageTitle title="Bookings" subtitle="Incoming and active bookings." />
      <VendorGate>{(vendorId) => <BookingsTable vendorId={vendorId} />}</VendorGate>
    </>
  );
}
