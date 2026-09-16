import { Alert, QueryState } from '@sinnapi/ui';
import { useProfile } from '../../hooks/useProfile';
import BusinessWorkspace from './BusinessWorkspace';

type Props = {
  vendorId: string;
  onDone: (message: string) => void;
};

/**
 * The Business tab: reads the record and hands it to the workspace.
 *
 * Every write below keeps its own busy and error state — the details form, the
 * coverage RPC, the logo upload — so a failed logo upload can't lock the save
 * bar. Verification stays read-only here: its writes are a private bucket and an
 * encrypting RPC, owned by the setup wizard.
 */
export default function BusinessSection({ vendorId, onDone }: Props) {
  const { data: vendor, isLoading, error } = useProfile(vendorId);

  return (
    <QueryState isLoading={isLoading} error={error}>
      {vendor ? (
        <BusinessWorkspace vendorId={vendorId} vendor={vendor} onDone={onDone} />
      ) : (
        <Alert severity="warning">
          We couldn&apos;t load your business profile. Refresh the page, or sign out and back in.
        </Alert>
      )}
    </QueryState>
  );
}
