import type { Control, UseFormSetValue } from 'react-hook-form';
import { Box, Stack, TextField, ToggleButton, ToggleButtonGroup, Typography } from '@sinnapi/ui';
import { ControlledField } from '@sinnapi/ui/forms';
import type { ContactRow } from '@sinnapi/ui/documents';
import type { VendorClientModel } from '@/lib/types';
import type { RecipientValues } from '../schema/recipient';

type Props = {
  control: Control<RecipientValues>;
  setValue: UseFormSetValue<RecipientValues>;
  mode: RecipientValues['recipient_mode'];
  contactId: string;
  clients: VendorClientModel[];
  contacts: ContactRow[];
  disabled?: boolean;
};

const NEW_CONTACT = '';

/**
 * Who the document is for. Two ways in, chosen with one toggle:
 *
 *   On Sinnapi    pick a client you already have a quote or booking with.
 *                 Sinnapi fills in their name and keeps their email private.
 *   Someone else  pick a saved client, or type a new one — they are saved
 *                 for next time when the document is issued.
 */
export default function RecipientFields({
  control,
  setValue,
  mode,
  contactId,
  clients,
  contacts,
  disabled,
}: Props) {
  function chooseContact(id: string) {
    setValue('contact_id', id, { shouldDirty: true });
    const c = contacts.find((x) => x.id === id);
    setValue('recipient_name', c?.full_name ?? '', { shouldDirty: true });
    setValue('recipient_company', c?.company_name ?? '', { shouldDirty: true });
    setValue('recipient_email', c?.email ?? '', { shouldDirty: true });
    setValue('recipient_phone', c?.phone ?? '', { shouldDirty: true });
    setValue('recipient_address', c?.address ?? '', { shouldDirty: true });
  }

  return (
    <Stack spacing={2}>
      <ToggleButtonGroup
        exclusive
        size="small"
        value={mode}
        disabled={disabled}
        onChange={(_, next: RecipientValues['recipient_mode'] | null) => {
          if (next) setValue('recipient_mode', next, { shouldDirty: true, shouldValidate: false });
        }}
        aria-label="Who is this for"
        sx={{ alignSelf: 'flex-start' }}
      >
        <ToggleButton value="client" sx={{ px: 2, minHeight: 44 }}>
          On Sinnapi
        </ToggleButton>
        <ToggleButton value="external" sx={{ px: 2, minHeight: 44 }}>
          Someone else
        </ToggleButton>
      </ToggleButtonGroup>

      {mode === 'client' ? (
        <>
          <ControlledField
            name="client_id"
            control={control}
            label="Choose a client"
            disabled={disabled}
            options={clients.map((c) => ({ value: c.client_id, label: c.display_name }))}
            helperText={
              clients.length === 0
                ? 'Clients appear here once they have asked you for a quote or booked you.'
                : 'Their email stays private. When you send this, Sinnapi delivers it for you.'
            }
          />
          <ControlledField
            name="recipient_address"
            control={control}
            label="Address on the document (optional)"
            disabled={disabled}
          />
        </>
      ) : (
        <>
          {contacts.length > 0 && (
            // Not a ControlledField: choosing a saved client fills five other
            // fields, so the change goes through `chooseContact`, not straight
            // into `contact_id`.
            <TextField
              select
              fullWidth
              label="Saved client"
              value={contactId}
              disabled={disabled}
              onChange={(e) => chooseContact(e.target.value)}
              SelectProps={{ native: true }}
              InputLabelProps={{ shrink: true }}
            >
              <option value={NEW_CONTACT}>New client</option>
              {contacts.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.company_name ? `${c.full_name} — ${c.company_name}` : c.full_name}
                </option>
              ))}
            </TextField>
          )}
          <Box
            sx={{
              display: 'grid',
              gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, minmax(0, 1fr))' },
              gap: 2,
            }}
          >
            <ControlledField
              name="recipient_name"
              control={control}
              label="Name"
              disabled={disabled}
              required
            />
            <ControlledField
              name="recipient_company"
              control={control}
              label="Company (optional)"
              disabled={disabled}
            />
            <ControlledField
              name="recipient_email"
              control={control}
              label="Email (to send it)"
              type="email"
              disabled={disabled}
            />
            <ControlledField
              name="recipient_phone"
              control={control}
              label="Phone (optional)"
              disabled={disabled}
            />
          </Box>
          <ControlledField
            name="recipient_address"
            control={control}
            label="Address (optional)"
            disabled={disabled}
          />
          {contactId === NEW_CONTACT && (
            <Typography variant="body2" color="text.secondary">
              New clients are saved to your Saved clients when you issue the document.
            </Typography>
          )}
        </>
      )}
    </Stack>
  );
}
