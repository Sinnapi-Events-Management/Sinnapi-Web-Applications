import { Link as RouterLink } from 'react-router-dom';
import { Alert, Button, SectionCard, Stack } from '@sinnapi/ui';
import ChatIcon from '@mui/icons-material/Chat';
import CompareArrowsIcon from '@mui/icons-material/CompareArrows';
import StorefrontIcon from '@mui/icons-material/Storefront';
import type { VendorRefModel } from '@/lib/types';
import { useStartConversation } from '@/hooks/messaging/useStartConversation';

type Props = {
  vendorId: string | null;
  vendor: VendorRefModel | null;
};

/**
 * Where to go from here. Navigation and correspondence only — nothing on this
 * card changes the quotation, which is what keeps the destructive controls next
 * door from being tapped by someone reaching for "Message vendor".
 *
 * Messaging leads, because the most common thing a client wants after reading a
 * quote is to ask one question about it — a round trip far cheaper than a
 * formal revision request for both sides.
 */
export default function QuotationNextStepsCard({ vendorId, vendor }: Props) {
  // Was a page-local `useMessageVendor`; the find-or-create now lives in one
  // shared hook so the vendor profile, the booking panel and this card cannot
  // drift on how a thread gets opened.
  const message = useStartConversation();

  return (
    <SectionCard title="Next steps" icon={<ChatIcon />} accent="primary">
      {message.error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {message.error}
        </Alert>
      )}

      <Stack spacing={1.25}>
        <Button
          fullWidth
          variant="outlined"
          color="inherit"
          startIcon={<ChatIcon />}
          disabled={!vendorId || message.isBusy}
          onClick={() => void message.messageVendor(vendorId)}
        >
          Message vendor
        </Button>

        {vendor?.slug && (
          <Button
            fullWidth
            variant="outlined"
            color="inherit"
            startIcon={<StorefrontIcon />}
            component={RouterLink}
            to={`/discover/vendors/${vendor.slug}`}
          >
            View vendor profile
          </Button>
        )}

        <Button
          fullWidth
          variant="outlined"
          color="inherit"
          startIcon={<CompareArrowsIcon />}
          component={RouterLink}
          to="/quotations/compare"
        >
          Compare with other quotes
        </Button>
      </Stack>
    </SectionCard>
  );
}
