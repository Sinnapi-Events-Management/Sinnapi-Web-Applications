import { Box, CircularProgress } from "@mui/material";
import { useVendorContext } from "./VendorProvider";
import EmptyState from "@/components/ui/EmptyState";

// Renders children only when the signed-in user owns a vendor record.
// Otherwise prompts them to complete onboarding. (Subscription state is
// surfaced as a banner in AppShell, not a hard block — active bookings continue.)
export default function VendorGate({ children }: { children: (vendorId: string) => React.ReactNode }) {
  const { vendor, loading } = useVendorContext();
  if (loading) return <Box sx={{ display: "grid", placeItems: "center", py: 8 }}><CircularProgress /></Box>;
  if (!vendor) {
    return (
      <EmptyState
        title="Finish setting up your vendor account"
        description="This area unlocks once your vendor application is approved."
        ctaLabel="Go to onboarding"
        ctaHref="/onboarding"
      />
    );
  }
  return <>{children(vendor.id)}</>;
}
