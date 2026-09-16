import { Alert, QueryState } from '@sinnapi/ui';
import { useProfile as useAccountQuery } from '@/hooks/queries';
import PersonalWorkspace from './PersonalWorkspace';

type Props = {
  onDone: (message: string) => void;
};

/**
 * The Personal tab: reads the account and hands it to the workspace.
 *
 * Reads the profile itself rather than taking it from the page, so a vendor who
 * only ever opens the Business tab never fetches their personal details.
 */
export default function PersonalSection({ onDone }: Props) {
  const { data: profile, isLoading, error } = useAccountQuery();

  return (
    <QueryState isLoading={isLoading} error={error}>
      {profile ? (
        <PersonalWorkspace profile={profile} onDone={onDone} />
      ) : (
        <Alert severity="warning">
          We couldn&apos;t load your account. Refresh the page, or sign out and back in.
        </Alert>
      )}
    </QueryState>
  );
}
