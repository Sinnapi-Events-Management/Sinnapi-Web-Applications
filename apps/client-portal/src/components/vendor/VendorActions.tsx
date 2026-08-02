import { Stack, Button } from '@sinnapi/ui';
import RequestQuoteIcon from '@mui/icons-material/RequestQuote';
import EventAvailableIcon from '@mui/icons-material/EventAvailable';
import { useVendorActions } from './hooks/useVendorActions';
import VendorRequestDialogs from './components/organisms/VendorRequestDialogs';

export default function VendorActions({ vendorId }: { vendorId: string }) {
  const { openDialog, openQuote, openBooking, close } = useVendorActions();

  return (
    <>
      <Stack spacing={1.5}>
        <Button
          variant="contained"
          size="large"
          startIcon={<RequestQuoteIcon />}
          onClick={openQuote}
        >
          Request a quote
        </Button>
        <Button
          variant="outlined"
          size="large"
          startIcon={<EventAvailableIcon />}
          onClick={openBooking}
        >
          Request a booking
        </Button>
      </Stack>

      <VendorRequestDialogs vendorId={vendorId} open={openDialog} onClose={close} />
    </>
  );
}
