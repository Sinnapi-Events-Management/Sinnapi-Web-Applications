import { Stack, PageTitle, QueryState } from '@sinnapi/ui';
import { EmptyState } from '@sinnapi/ui/router';
import EscrowCard from './components/organisms/EscrowCard';
import { useEscrow } from './hooks/useEscrow';

/**
 * Every booking the client has funded through Sinnapi. Layout only —
 * `useEscrow` owns the read and the realtime subscription behind it, and each
 * card owns its own content.
 */
export default function Escrow() {
  const { rows, isLoading, error } = useEscrow();

  return (
    <>
      <PageTitle
        title="Escrow"
        subtitle="Money you have paid to Sinnapi, and where it is on its way to your vendors."
      />
      <QueryState isLoading={isLoading} error={error}>
        {rows.length === 0 ? (
          <EmptyState
            title="No escrow transactions"
            description="When you pay for a booking through Sinnapi Escrow, it appears here with a live view of where your money is."
            ctaLabel="View bookings"
            ctaHref="/bookings"
          />
        ) : (
          <Stack spacing={2}>
            {rows.map((e) => (
              <EscrowCard key={e.id} escrow={e} />
            ))}
          </Stack>
        )}
      </QueryState>
    </>
  );
}
