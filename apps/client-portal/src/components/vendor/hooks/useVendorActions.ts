import { useState } from 'react';

/** Which request dialog, if any, is open on a vendor's page. */
export type VendorActionDialog = 'quote' | 'booking' | null;

/** Dialog state for the two requests a client can send a vendor. */
export function useVendorActions() {
  const [openDialog, setOpenDialog] = useState<VendorActionDialog>(null);

  return {
    openDialog,
    openQuote: () => setOpenDialog('quote'),
    openBooking: () => setOpenDialog('booking'),
    close: () => setOpenDialog(null),
  };
}
