import { Link as RouterLink } from 'react-router-dom';
import { Button, SectionCard, Stack } from '@sinnapi/ui';
import ChatIcon from '@mui/icons-material/Chat';
import CompareArrowsIcon from '@mui/icons-material/CompareArrows';
import StorefrontIcon from '@mui/icons-material/Storefront';
import type { VendorRefModel } from '@/lib/types';
import MessageVendorButton from '../molecules/MessageVendorButton';

type Props = {
  vendorId: string | null;
  vendor: VendorRefModel | null;
  onMessageVendor: () => void;
  isMessaging: boolean;
};

/**
 * Where to go from here. Navigation and correspondence only — nothing on this
 * card changes the quotation, which is what keeps the destructive controls next
 * door from being tapped by someone reaching for "Message vendor".
 *
 * Messaging leads, because the most common thing a client wants after reading a
 * quote is to ask one question about it — a round trip far cheaper than a
 * formal revision request for both sides.
 *
 * IT NO LONGER LEAVES THE PAGE. This button used to find-or-create the thread
 * and then navigate to `/messages/:id`, which meant asking "what does line
 * three cover?" cost the client the quote they were asking about — they had to
 * remember the number, or come back for it, or answer from memory. The thread
 * is now a tab on this page, so the button opens it in place and the quote stays
 * one tap away. `useQuotationDetailPage` owns both halves of that; this card is
 * handed a callback and knows nothing about conversations.
 *
 * The error state left with the navigation. A failure now surfaces in the
 * message tab, which is where the button sends the reader either way — two
 * places reporting one refusal is how a client ends up seeing it twice.
 */
export default function QuotationNextStepsCard({
  vendorId,
  vendor,
  onMessageVendor,
  isMessaging,
}: Props) {
  return (
    <SectionCard title="Next steps" icon={<ChatIcon />} accent="primary">
      <Stack spacing={1.25}>
        <MessageVendorButton
          onClick={onMessageVendor}
          busy={isMessaging}
          disabled={!vendorId}
          fullWidth
        />

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
