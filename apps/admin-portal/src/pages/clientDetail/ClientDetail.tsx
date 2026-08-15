import { Alert, Snackbar, QueryState } from '@sinnapi/ui';
import { useClientDetail } from './hooks/useClientDetail';
import ClientHero from './components/ClientHero';
import ClientStats from './components/ClientStats';
import ClientTabs from './components/ClientTabs';
import ClientStatusDialog from '../clients/components/organisms/ClientStatusDialog';
import ClientDeleteDialog from '../clients/components/organisms/ClientDeleteDialog';
import ClientPasswordResetDialog from '../clients/components/organisms/ClientPasswordResetDialog';
import { EmptyState } from '@sinnapi/ui/router';

export default function ClientDetail() {
  const { client, kpis, isLoading, error, status, remove, passwordReset, navigate } =
    useClientDetail();

  const pageError = status.err ?? remove.err ?? passwordReset.err;

  return (
    <QueryState isLoading={isLoading} error={error}>
      {!client ? (
        <EmptyState title="Client not found" ctaLabel="Back to clients" ctaHref="/clients" />
      ) : (
        <>
          <ClientHero
            client={client}
            onRequestStatusChange={(next) => status.request(client, next)}
            onResetPassword={() => passwordReset.request(client)}
            onRequestDelete={() => remove.request(client)}
          />
          {pageError && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {pageError}
            </Alert>
          )}
          <ClientStats kpis={kpis} />
          <ClientTabs clientId={client.id} clientName={client.full_name} />

          <ClientStatusDialog
            pending={status.pending}
            busy={status.busy}
            onCancel={status.cancel}
            onConfirm={status.confirm}
          />
          <ClientDeleteDialog
            pending={remove.pending}
            busy={remove.busy}
            onCancel={remove.cancel}
            // Removing a client from their own page: return to the list on success.
            onConfirm={async () => {
              if (await remove.confirm()) navigate('/clients');
            }}
          />
          <ClientPasswordResetDialog
            pending={passwordReset.pending}
            busy={passwordReset.busy}
            onCancel={passwordReset.cancel}
            onConfirm={passwordReset.confirm}
          />

          <Snackbar
            open={!!passwordReset.notice}
            autoHideDuration={6000}
            onClose={passwordReset.clearNotice}
            anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
          >
            <Alert
              severity="success"
              variant="filled"
              onClose={passwordReset.clearNotice}
              sx={{ width: '100%' }}
            >
              {passwordReset.notice}
            </Alert>
          </Snackbar>
        </>
      )}
    </QueryState>
  );
}
