import { useState } from 'react';
import {
  Alert,
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Stack,
  useMediaQuery,
  useTheme,
} from '@sinnapi/ui';
import { ControlledField, useZodForm } from '@sinnapi/ui/forms';
import { documentErrorMessage, type ContactRow } from '@sinnapi/ui/documents';
import { useSaveContact } from '@/hooks/documentQueries';
import {
  contactErrorMessage,
  contactFormSchema,
  contactInput,
  contactValues,
  type ContactFormValues,
} from '@/components/documents/schema/contactForm';

type Props = {
  vendorId: string;
  /** `null` to add, a row to edit. */
  contact: ContactRow | null;
  onClose: (savedMessage?: string) => void;
};

function ContactForm({ vendorId, contact, onClose }: Props) {
  const [error, setError] = useState<string | null>(null);
  const save = useSaveContact(vendorId);
  const { control, handleSubmit } = useZodForm(contactFormSchema, {
    defaultValues: contactValues(contact),
  });

  const submit = handleSubmit(async (values: ContactFormValues) => {
    setError(null);
    try {
      await save.mutateAsync({ id: contact?.id ?? null, values: contactInput(values) });
      onClose(contact ? 'Client updated' : `${values.full_name} saved`);
    } catch (e) {
      setError(
        contactErrorMessage(e) ?? documentErrorMessage(e, 'This client could not be saved.'),
      );
    }
  });

  return (
    <Box component="form" noValidate onSubmit={submit}>
      <DialogContent>
        <Stack spacing={2}>
          <Box
            sx={{
              display: 'grid',
              gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, minmax(0, 1fr))' },
              gap: 2,
            }}
          >
            <ControlledField name="full_name" control={control} label="Name" required autoFocus />
            <ControlledField name="company_name" control={control} label="Company (optional)" />
            <ControlledField name="email" control={control} label="Email (optional)" type="email" />
            <ControlledField name="phone" control={control} label="Phone (optional)" />
          </Box>
          <ControlledField name="address" control={control} label="Address (optional)" />
          <ControlledField
            name="notes"
            control={control}
            label="Notes (only you see these)"
            multiline
            minRows={2}
          />
          {error && <Alert severity="error">{error}</Alert>}
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button onClick={() => onClose()} disabled={save.isPending} color="inherit">
          Cancel
        </Button>
        <Button type="submit" variant="contained" disabled={save.isPending}>
          {save.isPending ? 'Saving…' : 'Save client'}
        </Button>
      </DialogActions>
    </Box>
  );
}

/** Add or edit a saved client. Mounted only while open, so each open starts fresh. */
export default function ContactDialog({ open, ...props }: Props & { open: boolean }) {
  const theme = useTheme();
  const fullScreen = useMediaQuery(theme.breakpoints.down('sm'));
  return (
    <Dialog
      open={open}
      onClose={() => props.onClose()}
      fullWidth
      maxWidth="sm"
      fullScreen={fullScreen}
    >
      <DialogTitle>{props.contact ? 'Edit client' : 'Add a client'}</DialogTitle>
      {open && <ContactForm {...props} />}
    </Dialog>
  );
}
