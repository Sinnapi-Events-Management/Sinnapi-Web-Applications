import type { StackProps } from '@mui/material';
import { Stack, Button } from '@sinnapi/ui';
import RequestQuoteIcon from '@mui/icons-material/RequestQuote';
import EventAvailableIcon from '@mui/icons-material/EventAvailable';
import { useVendorActions } from './hooks/useVendorActions';
import VendorRequestDialogs from './components/organisms/VendorRequestDialogs';

type Props = {
  vendorId: string;
  /**
   * How the two buttons stack. Defaults to a column, which is what a narrow
   * sidebar wants; the profile's compact panel passes a responsive value so the
   * pair sits side by side once there is a phone's width to do it in.
   */
  direction?: StackProps['direction'];
};

export default function VendorActions({ vendorId, direction = 'column' }: Props) {
  const { openDialog, openQuote, openBooking, close } = useVendorActions();

  return (
    <>
      <Stack direction={direction} spacing={1.5} sx={{ '& > *': { flex: 1 } }}>
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
