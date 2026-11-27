import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  ConfirmDialog,
  IconButton,
  SearchField,
  Stack,
  Toast,
  Tooltip,
  Typography,
} from '@sinnapi/ui';
import { EmptyState } from '@sinnapi/ui/router';
import { documentErrorMessage } from '@sinnapi/ui/documents';
import EditIcon from '@mui/icons-material/EditOutlined';
import DeleteIcon from '@mui/icons-material/DeleteOutline';
import { useContacts } from '../../hooks/useContacts';
import ContactDialog from './ContactDialog';

/**
 * Saved clients: people the vendor bills who are not on Sinnapi. Saved
 * automatically the first time a document is issued to them, or added here.
 * Removing one does not touch documents already issued to them.
 */
export default function ContactsPanel({ vendorId }: { vendorId: string }) {
  const c = useContacts(vendorId);

  return (
    <Stack spacing={2}>
      <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5} justifyContent="space-between">
        <SearchField
          value={c.search}
          onChange={c.setSearch}
          placeholder="Name, company, email or phone"
          ariaLabel="Search saved clients"
          size="small"
          sx={{ maxWidth: { sm: 360 }, flexGrow: 1 }}
        />
        <Button variant="outlined" onClick={c.openAdd} sx={{ minHeight: 40 }}>
          Add a client
        </Button>
      </Stack>

      {c.error && (
        <Alert severity="error">
          {documentErrorMessage(c.error, 'Saved clients could not be loaded.')}
        </Alert>
      )}

      {!c.isLoading && c.contacts.length === 0 && (
        <EmptyState
          embedded
          title={c.hasAny ? 'No saved clients match' : 'No saved clients yet'}
          description={
            c.hasAny
              ? 'Try another search.'
              : 'Clients who are not on Sinnapi are saved here when you invoice them. You can also add them yourself.'
          }
          ctaLabel={c.hasAny ? undefined : 'Add a client'}
          onCta={c.hasAny ? undefined : c.openAdd}
        />
      )}

      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: { xs: '1fr', md: 'repeat(2, minmax(0, 1fr))' },
          gap: 1.5,
        }}
      >
        {c.contacts.map((contact) => (
          <Card key={contact.id} variant="outlined">
            <CardContent
              sx={{ display: 'flex', gap: 1, alignItems: 'flex-start', '&:last-child': { pb: 2 } }}
            >
              <Stack spacing={0.25} sx={{ flexGrow: 1, minWidth: 0 }}>
                <Typography variant="subtitle1" fontWeight={700} noWrap>
                  {contact.full_name}
                </Typography>
                {contact.company_name && (
                  <Typography variant="body2" color="text.secondary" noWrap>
                    {contact.company_name}
                  </Typography>
                )}
                <Typography
                  variant="body2"
                  color="text.secondary"
                  sx={{ overflowWrap: 'anywhere' }}
                >
                  {[contact.email, contact.phone].filter(Boolean).join(' · ') ||
                    'No email or phone saved'}
                </Typography>
              </Stack>
              <Tooltip title="Edit">
                <IconButton
                  aria-label={`Edit ${contact.full_name}`}
                  onClick={() => c.openEdit(contact)}
                >
                  <EditIcon fontSize="small" />
                </IconButton>
              </Tooltip>
              <Tooltip title="Remove">
                <IconButton
                  aria-label={`Remove ${contact.full_name}`}
                  onClick={() => c.askDelete(contact)}
                >
                  <DeleteIcon fontSize="small" />
                </IconButton>
              </Tooltip>
            </CardContent>
          </Card>
        ))}
      </Box>

      <ContactDialog
        open={c.editing !== undefined}
        vendorId={vendorId}
        contact={c.editing ?? null}
        onClose={c.closeEditor}
      />
      <ConfirmDialog
        open={!!c.deleting}
        title={`Remove ${c.deleting?.full_name ?? 'this client'}?`}
        description="They will no longer appear in your saved clients. Invoices and receipts already issued to them stay as they are."
        confirmLabel="Remove"
        destructive
        loading={c.deleteBusy}
        onConfirm={c.confirmDelete}
        onCancel={c.cancelDelete}
      />
      <Toast toast={c.toast} onClose={c.dismissToast} />
    </Stack>
  );
}
