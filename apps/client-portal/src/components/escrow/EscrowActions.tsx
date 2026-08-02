import { Button, Stack, Alert } from '@sinnapi/ui';
import { useEscrowActions } from './hooks/useEscrowActions';
import DisputeDialog from './components/organisms/DisputeDialog';

type Props = { escrowId: string; status: string };

export default function EscrowActions({ escrowId, status }: Props) {
  const {
    busy,
    error,
    disputeOpen,
    openDispute,
    closeDispute,
    canConfirm,
    canDispute,
    confirmRelease,
  } = useEscrowActions(escrowId, status);

  return (
    <>
      {error && (
        <Alert severity="error" sx={{ mb: 1 }}>
          {error}
        </Alert>
      )}
      <Stack direction="row" spacing={1}>
        {canConfirm && (
          <Button size="small" variant="contained" disabled={busy} onClick={confirmRelease}>
            Confirm &amp; release
          </Button>
        )}
        {canDispute && (
          <Button
            size="small"
            color="error"
            variant="outlined"
            disabled={busy}
            onClick={openDispute}
          >
            Raise dispute
          </Button>
        )}
      </Stack>

      <DisputeDialog open={disputeOpen} escrowId={escrowId} onClose={closeDispute} />
    </>
  );
}
